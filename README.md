## Install
```npm install```

If you have issues on Centos with puppeteer (ref: https://github.com/GoogleChrome/puppeteer/issues/391#issuecomment-398660894)
```yum -y install libX11 libXcomposite libXcursor libXdamage libXext libXi libXtst cups-libs libXScrnSaver libXrandr alsa-lib pango atk at-spi2-atk gtk3```

Sandbox issue on centos (ref: https://stackoverflow.com/a/55450450/11286273)
```echo "user.max_user_namespaces=15000" >> /etc/sysctl.conf;sysctl -p```
