@echo off
cd /d C:\Users\dan_i\Documents\GitHub\sevennova\worker
node_modules\.bin\wrangler.cmd deploy > C:\Users\dan_i\Documents\GitHub\sevennova\deploy_out.txt 2>&1
echo DEPLOY_EXIT_CODE=%ERRORLEVEL% >> C:\Users\dan_i\Documents\GitHub\sevennova\deploy_out.txt
