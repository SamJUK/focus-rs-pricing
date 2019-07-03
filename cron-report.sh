tail -n 34 /scripts/focus-rs-pricing/frs.txt | mail -s "Focus RS Pricing Report" -r cron@samdjames.uk samjuk1999@gmail.com && \
tail -n 49 /scripts/focus-rs-pricing/fstp.txt | mail -s "Focus ST3 Petrol Pricing Report" -r cron@samdjames.uk samjuk1999@gmail.com && \
tail -n 49 /scripts/focus-rs-pricing/fstd.txt | mail -s "Focus ST3 Diesel Pricing Report" -r cron@samdjames.uk samjuk1999@gmail.com
