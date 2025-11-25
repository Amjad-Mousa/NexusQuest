interface ExecutionResult {
    output: string;
    error: string;
    executionTime: number;
}
export declare function executeCode(code: string, language: string): Promise<ExecutionResult>;
export {};
//# sourceMappingURL=dockerService.d.ts.map