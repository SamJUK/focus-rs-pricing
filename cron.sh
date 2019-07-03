cd /scripts/focus-rs-pricing && \
make='FORD' model='FOCUS' aggregatedTrim='RS' postcode='CF54JS' years='2016,2017,2018' node index.js >> frs.txt && \
make='FORD' model='FOCUS' aggregatedTrim='ST-3' postcode='CF54JS' years='2015,2016,2017,2018' fuel_type="Petrol" node index.js >> fstp.txt && \
make='FORD' model='FOCUS' aggregatedTrim='ST-3' postcode='CF54JS' years='2015,2016,2017,2018' fuel_type="Diesel" node index.js >> fstd.txt
