$files = Get-ChildItem -Path "src" -Recurse -Include "*.jsx","*.js"
foreach ($file in $files) {
    $c = [IO.File]::ReadAllText($file.FullName)
    $u = $c
    # Fix any remaining Fi* icons that were missed (compound words like FiUserCheck)
    $u = $u -replace 'FiUserCheck','LuUserCheck'
    $u = $u -replace 'FiUserMinus','LuUserMinus'
    $u = $u -replace 'FiUserCircle','LuCircleUserRound'
    $u = $u -replace 'FiCheckCircle','LuCircleCheck'
    $u = $u -replace 'FiXCircle','LuCircleX'
    $u = $u -replace 'FiHelpCircle','LuCircleHelp'
    $u = $u -replace 'FiAlertCircle','LuCircleAlert'
    $u = $u -replace 'FiAlertTriangle','LuTriangleAlert'
    # Fix any remaining Fi* prefix that was not caught before
    $u = $u -replace 'Fi([A-Z])','Lu$1'
    if ($u -ne $c) {
        [IO.File]::WriteAllText($file.FullName, $u)
        Write-Host "Updated: $($file.Name)"
    }
}
Write-Host "Done."
