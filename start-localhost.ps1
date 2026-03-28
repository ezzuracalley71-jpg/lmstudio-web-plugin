param(
    [int]$Port = 8080
)

$env:PORT = $Port
node .\server.mjs
