# Test Library Installation Feature
# This script tests the new package.json generation and dependency management

$BASE_URL = "http://localhost:3000/api"
$PROJECT_ID = ""
$USER_ID = "" # Will be set after authentication

# Helper function to make requests
function Invoke-ApiRequest {
    param(
        [string]$Method,
        [string]$Endpoint,
        [object]$Body,
        [string]$Token
    )
    
    $headers = @{
        "Content-Type" = "application/json"
    }
    
    if ($Token) {
        $headers["Authorization"] = "Bearer $Token"
    }
    
    $url = "$BASE_URL$Endpoint"
    
    try {
        if ($Body) {
            $bodyJson = $Body | ConvertTo-Json -Depth 10
            Write-Host "Request: $Method $url" -ForegroundColor Cyan
            Write-Host "Body: $bodyJson" -ForegroundColor Gray
            $response = Invoke-WebRequest -Uri $url -Method $Method -Headers $headers -Body $bodyJson
        } else {
            Write-Host "Request: $Method $url" -ForegroundColor Cyan
            $response = Invoke-WebRequest -Uri $url -Method $Method -Headers $headers
        }
        
        $result = $response.Content | ConvertFrom-Json
        Write-Host "Response: " -ForegroundColor Green
        Write-Host ($result | ConvertTo-Json -Depth 10) -ForegroundColor Green
        return $result
    } catch {
        Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
        if ($_.Exception.Response) {
            Write-Host "Response: $($_.Exception.Response.Content | ConvertFrom-Json)" -ForegroundColor Red
        }
        return $null
    }
}

Write-Host "========================================" -ForegroundColor Yellow
Write-Host "Testing Library Installation Feature" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Yellow

# Note: You need to be authenticated. Replace with your actual token or user details
Write-Host "`nNote: Make sure you have a valid authentication token." -ForegroundColor Yellow
$token = Read-Host "Enter your authentication token (or press Enter to skip)"

if (!$token) {
    Write-Host "Skipping tests - token required for authentication" -ForegroundColor Yellow
    exit
}

Write-Host "`n1. Creating a JavaScript Project..." -ForegroundColor Cyan
$projectBody = @{
    name = "Test JavaScript Project $(Get-Date -Format 'HHmmss')"
    description = "A test project to verify package.json generation"
    language = "javascript"
}

$projectResult = Invoke-ApiRequest -Method "POST" -Endpoint "/projects" -Body $projectBody -Token $token

if ($projectResult.success) {
    $PROJECT_ID = $projectResult.data._id
    Write-Host "✓ Project created with ID: $PROJECT_ID" -ForegroundColor Green
    
    Write-Host "`nProject files:" -ForegroundColor Cyan
    $projectResult.data.files | ForEach-Object {
        Write-Host "  - $($_.name)" -ForegroundColor Green
    }
} else {
    Write-Host "✗ Failed to create project" -ForegroundColor Red
    exit
}

Write-Host "`n2. Checking for package.json..." -ForegroundColor Cyan
$hasPackageJson = $projectResult.data.files | Where-Object { $_.name -eq "package.json" }

if ($hasPackageJson) {
    Write-Host "✓ package.json was automatically generated!" -ForegroundColor Green
    Write-Host "Content:" -ForegroundColor Cyan
    Write-Host $hasPackageJson.content -ForegroundColor Gray
} else {
    Write-Host "✗ package.json was not found" -ForegroundColor Red
}

Write-Host "`n3. Adding dependencies..." -ForegroundColor Cyan

# Add first dependency
$dep1 = @{
    name = "axios"
    version = "1.6.0"
}
$depResult1 = Invoke-ApiRequest -Method "POST" -Endpoint "/projects/$PROJECT_ID/dependencies" -Body $dep1 -Token $token

if ($depResult1.success) {
    Write-Host "✓ Added axios@1.6.0" -ForegroundColor Green
}

# Add second dependency
$dep2 = @{
    name = "lodash"
    version = "4.17.21"
}
$depResult2 = Invoke-ApiRequest -Method "POST" -Endpoint "/projects/$PROJECT_ID/dependencies" -Body $dep2 -Token $token

if ($depResult2.success) {
    Write-Host "✓ Added lodash@4.17.21" -ForegroundColor Green
}

Write-Host "`n4. Getting all dependencies..." -ForegroundColor Cyan
$getDepsResult = Invoke-ApiRequest -Method "GET" -Endpoint "/projects/$PROJECT_ID/dependencies" -Token $token

if ($getDepsResult.success) {
    Write-Host "✓ Current dependencies:" -ForegroundColor Green
    $getDepsResult.dependencies | ForEach-Object {
        $_.PSObject.Properties | ForEach-Object {
            Write-Host "  - $($_.Name): $($_.Value)" -ForegroundColor Green
        }
    }
}

Write-Host "`n5. Testing execution with dependencies..." -ForegroundColor Cyan

$executionBody = @{
    files = @(
        @{
            name = "main.js"
            content = @"
const axios = require('axios');
const _ = require('lodash');

console.log('Testing dependencies:');
console.log('axios version:', axios.VERSION);
console.log('lodash version:', _().VERSION);
console.log('Success!');
"@
            language = "javascript"
        }
    )
    mainFile = "main.js"
    language = "javascript"
    dependencies = @{
        axios = "1.6.0"
        lodash = "4.17.21"
    }
}

$execResult = Invoke-ApiRequest -Method "POST" -Endpoint "/execution/run-project" -Body $executionBody -Token $token

if ($execResult.success) {
    Write-Host "✓ Execution succeeded!" -ForegroundColor Green
    Write-Host "Output:" -ForegroundColor Cyan
    Write-Host $execResult.output -ForegroundColor Gray
    if ($execResult.error) {
        Write-Host "Errors/Warnings:" -ForegroundColor Yellow
        Write-Host $execResult.error -ForegroundColor Yellow
    }
    Write-Host "Execution Time: $($execResult.executionTime)ms" -ForegroundColor Cyan
} else {
    Write-Host "✗ Execution failed" -ForegroundColor Red
    Write-Host "Error: $($execResult.error)" -ForegroundColor Red
}

Write-Host "`n6. Deleting a dependency..." -ForegroundColor Cyan
$delResult = Invoke-ApiRequest -Method "DELETE" -Endpoint "/projects/$PROJECT_ID/dependencies/axios" -Token $token

if ($delResult.success) {
    Write-Host "✓ Deleted axios" -ForegroundColor Green
    Write-Host "Remaining dependencies:" -ForegroundColor Cyan
    $delResult.dependencies | ForEach-Object {
        $_.PSObject.Properties | ForEach-Object {
            Write-Host "  - $($_.Name): $($_.Value)" -ForegroundColor Green
        }
    }
}

Write-Host "`n7. Testing Python with dependencies..." -ForegroundColor Cyan

$pythonProjectBody = @{
    name = "Test Python Project $(Get-Date -Format 'HHmmss')"
    description = "A test project for Python dependencies"
    language = "python"
}

$pythonProjectResult = Invoke-ApiRequest -Method "POST" -Endpoint "/projects" -Body $pythonProjectBody -Token $token

if ($pythonProjectResult.success) {
    $PYTHON_PROJECT_ID = $pythonProjectResult.data._id
    Write-Host "✓ Python project created with ID: $PYTHON_PROJECT_ID" -ForegroundColor Green
    
    # Add Python dependencies
    $pyDep = @{
        name = "requests"
        version = "2.31.0"
    }
    Invoke-ApiRequest -Method "POST" -Endpoint "/projects/$PYTHON_PROJECT_ID/dependencies" -Body $pyDep -Token $token | Out-Null
    
    # Test execution
    $pythonExecBody = @{
        files = @(
            @{
                name = "main.py"
                content = @"
import requests

response = requests.get('https://api.github.com')
print(f'Status Code: {response.status_code}')
print('Success!')
"@
                language = "python"
            }
        )
        mainFile = "main.py"
        language = "python"
        dependencies = @{
            requests = "2.31.0"
        }
    }
    
    $pythonExecResult = Invoke-ApiRequest -Method "POST" -Endpoint "/execution/run-project" -Body $pythonExecBody -Token $token
    
    if ($pythonExecResult.success) {
        Write-Host "✓ Python execution with dependencies succeeded!" -ForegroundColor Green
        Write-Host "Output:" -ForegroundColor Cyan
        Write-Host $pythonExecResult.output -ForegroundColor Gray
    }
}

Write-Host "`n========================================" -ForegroundColor Yellow
Write-Host "Test completed!" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Yellow
