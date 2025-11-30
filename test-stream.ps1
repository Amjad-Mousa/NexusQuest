$sessionId = "test-$(Get-Random)"
$uri = "http://localhost:9876/api/stream/stream-start"

$body = @{
    code = 'print("Hello from Python")'
    language = 'python'
    sessionId = $sessionId
} | ConvertTo-Json

Write-Host "Testing stream-start with sessionId: $sessionId"
Write-Host "Request body: $body"

try {
    $response = Invoke-WebRequest -Uri $uri -Method POST -ContentType "application/json" -Body $body
    Write-Host "Response: $($response.Content)"
    
    # Extract sessionId from response
    $responseData = $response.Content | ConvertFrom-Json
    $returnedSessionId = $responseData.sessionId
    
    Write-Host "Waiting 2 seconds for execution..."
    Start-Sleep -Seconds 2
    
    Write-Host "Getting output from stream..."
    $outputUri = "http://localhost:9876/api/stream/stream-output/$returnedSessionId"
    
    # Test with direct connection
    $webClient = New-Object System.Net.WebClient
    $stream = $webClient.OpenRead($outputUri)
    $reader = New-Object System.IO.StreamReader($stream)
    
    Write-Host "Stream output:"
    $count = 0
    while (-not $reader.EndOfStream -and $count -lt 20) {
        $line = $reader.ReadLine()
        Write-Host $line
        $count++
        Start-Sleep -Milliseconds 100
    }
    
    $reader.Close()
    $stream.Close()
    
} catch {
    Write-Host "Error: $_"
}
