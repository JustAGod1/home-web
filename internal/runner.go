package internal

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"log"
	"os"
	"os/exec"
	"path/filepath"
	"sync"
	"time"
)

type ProjfRunner struct {
	executablePath string
	timeout        time.Duration
}

func NewProjfRunner(executablePath string) *ProjfRunner {
	return &ProjfRunner{
		executablePath: executablePath,
		timeout:        5 * time.Second, // default timeout
	}
}

func (r *ProjfRunner) SetTimeout(timeout time.Duration) {
	r.timeout = timeout
}

func (r *ProjfRunner) RunCode(code string) (string, error) {
	tmpFile, err := os.CreateTemp("", "projf-code-*.pf")
	if err != nil {
		return "", fmt.Errorf("failed to create temp file: %v", err)
	}
	defer os.Remove(tmpFile.Name())

	log.Printf("Executing code: %s", code);

	if _, err := tmpFile.WriteString(code + " "); err != nil {
		return "", fmt.Errorf("failed to write code to temp file: %v", err)
	}
	if err := tmpFile.Close(); err != nil {
		return "", fmt.Errorf("failed to close temp file: %v", err)
	}

	// Create context with timeout
	ctx, cancel := context.WithTimeout(context.Background(), r.timeout)
	defer cancel()

	cmd := exec.CommandContext(ctx, r.executablePath, tmpFile.Name())

	// We'll use a pipe to capture both stdout and stderr merged together
	outputPipe, err := cmd.StdoutPipe()
	if err != nil {
		return "", fmt.Errorf("failed to create stdout pipe: %v", err)
	}
	cmd.Stderr = cmd.Stdout // Merge stderr into stdout

	var outputBuf bytes.Buffer
	var wg sync.WaitGroup
	wg.Add(1)

	// Stream output to buffer in a goroutine
	go func() {
		defer wg.Done()
		io.Copy(&outputBuf, outputPipe)
	}()

	// Start the command
	if err := cmd.Start(); err != nil {
		return "", fmt.Errorf("failed to start process: %v", err)
	}

	// Wait for output collection to complete
	wg.Wait()

	// Wait for process to finish
	err = cmd.Wait()
	output := outputBuf.String()

	// Check if the process was killed due to timeout
	if ctx.Err() == context.DeadlineExceeded {
		return output, fmt.Errorf("execution timed out after %v", r.timeout)
	}

	// Return merged output regardless of error status
	if err != nil {
		return output, fmt.Errorf("process failed: %v", err)
	}

	return output, nil
}

// Alternative version that runs in temp directory
func (r *ProjfRunner) RunCodeInTempDir(code string) (string, error) {
	tmpDir, err := os.MkdirTemp("", "projf-run-*")
	if err != nil {
		return "", fmt.Errorf("failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tmpDir)

	codeFile := filepath.Join(tmpDir, "code.pf")
	if err := os.WriteFile(codeFile, []byte(code), 0644); err != nil {
		return "", fmt.Errorf("failed to write code file: %v", err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), r.timeout)
	defer cancel()

	cmd := exec.CommandContext(ctx, r.executablePath, codeFile)
	cmd.Dir = tmpDir

	outputPipe, err := cmd.StdoutPipe()
	if err != nil {
		return "", fmt.Errorf("failed to create stdout pipe: %v", err)
	}
	cmd.Stderr = cmd.Stdout

	var outputBuf bytes.Buffer
	var wg sync.WaitGroup
	wg.Add(1)

	go func() {
		defer wg.Done()
		io.Copy(&outputBuf, outputPipe)
	}()

	if err := cmd.Start(); err != nil {
		return "", fmt.Errorf("failed to start process: %v", err)
	}

	wg.Wait()
	err = cmd.Wait()
	output := outputBuf.String()

	if ctx.Err() == context.DeadlineExceeded {
		return output, fmt.Errorf("execution timed out after %v", r.timeout)
	}

	if err != nil {
		return output, fmt.Errorf("process failed: %v", err)
	}

	return output, nil
}
