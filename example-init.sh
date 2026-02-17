#!/bin/sh
set -eu
echo "script-ran" > /tmp/sandbox-init.txt
mkdir -p /sandbox/host/.sandbox-meta
echo "ok" > /sandbox/host/.sandbox-meta/initialized.txt
