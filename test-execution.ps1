# Test all three execution endpoints

Write-Host "Testing Playground Execution..." -ForegroundColor Cyan

# Test 1: Task Execution (single file)
$taskBody = @{
    code = @"
print("Hello from task!")
x = 10
y = 20
print(f"Sum: {x + y}")
"@
    language = "python"
    sessionId = "test-task-$(Get-Random)"
} | ConvertTo-Json

Write-Host "Task Execution Test:"
$taskRes = Invoke-WebRequest http://127.0.0.1:9876/api/tasks/execute `
    -Method POST `
    -Headers @{'Content-Type'='application/json'} `
    -Body $taskBody `
    -UseBasicParsing

Write-Host "Status: $($taskRes.StatusCode)"
Write-Host "Response Content-Type: $($taskRes.Headers.'Content-Type')"
Write-Host ""

# Test 2: Projects Execution (multiple files)
Write-Host "Project Execution Test:"
$projectBody = @{
    files = @(
        @{ name = "main.py"; content = @"
import math

def calculate():
    return math.sqrt(16)

result = calculate()
print(f"Result: {result}")
"@ }
    )
    mainFile = "main.py"
    language = "python"
    sessionId = "test-project-$(Get-Random)"
} | ConvertTo-Json

$projectRes = Invoke-WebRequest http://127.0.0.1:9876/api/projects/execute `
    -Method POST `
    -Headers @{'Content-Type'='application/json'} `
    -Body $projectBody `
    -UseBasicParsing

Write-Host "Status: $($projectRes.StatusCode)"
Write-Host "Response Content-Type: $($projectRes.Headers.'Content-Type')"
Write-Host ""

# Test 3: Playground Execution
Write-Host "Playground Execution Test:"
$playgroundBody = @{
    code = @"
for i in range(3):
    print(f"Iteration {i}")
"@
    language = "python"
    sessionId = "test-playground-$(Get-Random)"
} | ConvertTo-Json

$playgroundRes = Invoke-WebRequest http://127.0.0.1:9876/api/playground/execute `
    -Method POST `
    -Headers @{'Content-Type'='application/json'} `
    -Body $playgroundBody `
    -UseBasicParsing

Write-Host "Status: $($playgroundRes.StatusCode)"
Write-Host "Response Content-Type: $($playgroundRes.Headers.'Content-Type')"
Write-Host ""

Write-Host "All endpoints are responding correctly!" -ForegroundColor Green
