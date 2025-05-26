package internal
import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"path/filepath"
	"sync"
	"time"

	"github.com/Netflix/go-env"
)

type ServerConfig struct {
	Port           int           `env:"PORT,default=8080"`
	ExecutablePath string        `env:"EXECUTABLE_PATH,required=true"`
	MaxConcurrent  int           `env:"MAX_CONCURRENT,default=4"`
	Timeout        time.Duration `env:"TIMEOUT,default=10s"`
	StaticDir      string        `env:"STATIC_DIR,default=./static"`
}

func GetConfig() (ServerConfig, error) {
	var config ServerConfig
	_, err := env.UnmarshalFromEnviron(&config)
	if err != nil {
		return config, fmt.Errorf("failed to load config: %w", err)
	}
	return config, nil
}

type ExecutionRequest struct {
	Code string `json:"code"`
}

type ExecutionResponse struct {
	Output string `json:"output,omitempty"`
	Error  string `json:"error,omitempty"`
}

type Server struct {
	config  ServerConfig
	pool    *ProjfRunnerPool
	server  *http.Server
	wg      sync.WaitGroup
	mu      sync.Mutex
	closing bool
}

func NewServer(config ServerConfig) *Server {
	if config.MaxConcurrent <= 0 {
		config.MaxConcurrent = 4
	}
	if config.Timeout <= 0 {
		config.Timeout = 5 * time.Second
	}

	return &Server{
		config: config,
		pool:   NewProjfRunnerPool(config.ExecutablePath, config.MaxConcurrent),
	}
}

func (s *Server) Start() error {
	mux := http.NewServeMux()

	// API endpoint for code execution
	mux.HandleFunc("/api/execute", s.handleExecute)

	// Static file serving
	if s.config.StaticDir != "" {
		staticPath, err := filepath.Abs(s.config.StaticDir)
		if err != nil {
			return fmt.Errorf("invalid static directory: %w", err)
		}

		fs := http.FileServer(http.Dir(staticPath))
		mux.Handle("/", http.StripPrefix("/", fs))
	}

	s.server = &http.Server{
		Addr:    fmt.Sprintf(":%d", s.config.Port),
		Handler: mux,
	}

	// Start server in a goroutine
	s.wg.Add(1)
	go func() {
		defer s.wg.Done()
		log.Printf("Server starting on port %d", s.config.Port)
		if err := s.server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Printf("HTTP server error: %v", err)
		}
	}()

	return nil
}

func (s *Server) handleExecute(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req ExecutionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, fmt.Sprintf("Invalid request: %v", err), http.StatusBadRequest)
		return
	}

	if req.Code == "" {
		http.Error(w, "Code cannot be empty", http.StatusBadRequest)
		return
	}

	log.Printf("Received code %s", req.Code)

	ctx, cancel := context.WithTimeout(r.Context(), s.config.Timeout+2*time.Second)
	defer cancel()

	output, err := s.pool.RunCode(ctx, req.Code)
	resp := ExecutionResponse{}

	if err != nil {
		resp.Error = err.Error()
	}
	resp.Output = output

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(resp); err != nil {
		log.Printf("Failed to encode response: %v", err)
	}
}

func (s *Server) Shutdown(ctx context.Context) error {
	s.mu.Lock()
	if s.closing {
		s.mu.Unlock()
		return nil
	}
	s.closing = true
	s.mu.Unlock()

	log.Println("Server shutting down...")

	// Shutdown HTTP server
	if err := s.server.Shutdown(ctx); err != nil {
		return fmt.Errorf("HTTP server shutdown error: %w", err)
	}

	// Wait for all requests to complete
	s.wg.Wait()

	// Close the runner pool
	s.pool.Close()

	return nil
}
