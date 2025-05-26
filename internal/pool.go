package internal

import (
	"context"
	"sync"
	"time"
)

// ProjfRunnerPool manages a pool of runners with limited concurrency
type ProjfRunnerPool struct {
	runnerFactory  func() *ProjfRunner
	maxConcurrent  int
	timeout        time.Duration
	runnerPool     sync.Pool
	queue          chan struct{}
	wg             sync.WaitGroup
}

// NewProjfRunnerPool creates a new pool of runners
func NewProjfRunnerPool(executablePath string, maxConcurrent int) *ProjfRunnerPool {
	if maxConcurrent < 1 {
		maxConcurrent = 1
	}

	pool := &ProjfRunnerPool{
		maxConcurrent: maxConcurrent,
		queue:         make(chan struct{}, maxConcurrent),
		timeout:       5 * time.Second, // default timeout
	}

	pool.runnerFactory = func() *ProjfRunner {
		runner := NewProjfRunner(executablePath)
		runner.SetTimeout(pool.timeout)
		return runner
	}

	// Initialize the sync.Pool
	pool.runnerPool.New = func() interface{} {
		return pool.runnerFactory()
	}

	return pool
}

// RunCode executes code through the pool with concurrency control
func (p *ProjfRunnerPool) RunCode(ctx context.Context, code string) (string, error) {
	// Acquire a slot from the pool
	select {
	case p.queue <- struct{}{}:
	case <-ctx.Done():
		return "", ctx.Err()
	}

	p.wg.Add(1)
	defer func() {
		<-p.queue // Release the slot
		p.wg.Done()
	}()

	// Get a runner from the pool
	runner := p.runnerPool.Get().(*ProjfRunner)
	defer p.runnerPool.Put(runner)

	// Use a channel to capture the result
	resultChan := make(chan struct {
		output string
		err    error
	}, 1)

	go func() {
		output, err := runner.RunCode(code)
		resultChan <- struct {
			output string
			err    error
		}{output, err}
	}()

	select {
	case <-ctx.Done():
		return "", ctx.Err()
	case res := <-resultChan:
		return res.output, res.err
	}
}

// Wait waits for all runners in the pool to complete
func (p *ProjfRunnerPool) Wait() {
	p.wg.Wait()
}

// Close waits for all runners to complete and cleans up resources
func (p *ProjfRunnerPool) Close() {
	p.Wait()
	close(p.queue)
}
