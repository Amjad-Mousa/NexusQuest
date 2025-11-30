$code = @"
x = 5
y = 10
print(x + y)
"@

$body = @{
    code = $code
    language = 'python'
    sessionId = "stream-test-123"
} | ConvertTo-Json

Write-Host "Testing Task Execution Endpoint" -ForegroundColor Cyan
Write-Host "Code to execute:" -ForegroundColor Yellow
Write-Host $code
Write-Host ""

$res = Invoke-WebRequest http://127.0.0.1:9876/api/tasks/execute `
    -Method POST `
    -Headers @{'Content-Type'='application/json'} `
    -Body $body `
    -UseBasicParsing

Write-Host "Response Status: $($res.StatusCode)" -ForegroundColor Green
Write-Host "Response Content:" -ForegroundColor Yellow
$res.Content -split '\n' | Where-Object {$_.Length -gt 0} | ForEach-Object { Write-Host $_ }
