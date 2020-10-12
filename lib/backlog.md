# psd-viewer
application.js -> 41
```javascript
const temp=setInterval(() => {
    if(typeof PSD_INS != 'undefined'){
        clearInterval(temp)
        this.setState({ loading:false, psd:PSD_INS });
    }
}, 10);
```
application.js -> 79
`Drop a PSD document here. -> Loading...`