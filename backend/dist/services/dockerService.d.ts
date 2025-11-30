interface ExecutionResult {
    output: string;
    error: string;
    executionTime: number;
}
export interface ProjectFile {
    name: string;
    content: string;
    language: string;
}
export interface ProjectExecutionRequest {
    files: ProjectFile[];
    mainFile: string;
    language: string;
    input?: string;
}
export declare function checkDockerStatus(): Promise<{
    available: boolean;
    message: string;
}>;
export declare function executeCode(code: string, language: string, input?: string): Promise<ExecutionResult>;
export declare function executeProject(request: ProjectExecutionRequest): Promise<ExecutionResult>;
export {};
//# sourceMappingURL=dockerService.d.ts.map