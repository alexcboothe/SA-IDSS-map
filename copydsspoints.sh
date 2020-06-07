#!/bin/bash

# Copy DSS points from L-drive to FLARE2 
cp /data/ldad/web/DSS/*.csv /var/www/html/FLARE2/IDSS-tracker/.
# Modify permissions
chmod 755 /var/www/html/FLARE2/IDSS-tracker/activeDSSpoints.csv

echo "Done, Boi!"