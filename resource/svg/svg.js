const zoomOutIcon = "url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAMAAADXqc3KAAAAA3NCSVQICAjb4U/gAAAACXBIWXMAAAEwAAABMAGW7EZ5AAAAGXRFWHRTb2Z0d2FyZQB3d3cuaW5rc2NhcGUub3Jnm+48GgAAAO1QTFRF////////////4+Pj6urq5+fn5ubm5+fn4ujo5OTk9bRa4+fn5enp4+bm5Ofn9bRY4+jo5Ojo87Na5Obm5ebm5Ojo4+fn5ejo6KtW5Ofn5Obm9LNZ5Ofn46dU5Ofn9LRZ48um5Mqm5Ofn5Ofn5Ofn5Ofn5Ofn5Ofn5Ofn5OfnPbOeP7SfXL6tXL+thM3AyOfhyefi26JQ26NS3Ktk4aZS4adU4tnI4/Du4/Hu5Ofn5ejo5ujo5unp5+rq6Ovr6evr6uzs7O7u7e/v7vDw7vX08PLy8fLy8vPz8vT09LRZ9Pb29fb29ff39vf39/j44kksWgAAACp0Uk5TAAEDCQwVHyAsMDM/RVJUYmR6gIWHj5SkpK26vb7Ax9bd39/g6uzy9vr+enQd/wAAAQ5JREFUGBltwYd6wWAYBtDPpnas2q1Np1a1rxUSwo989385zR9R8tQ5ZPPE0sVmu5RN+MklWIGjEaUrqQ6wWG0MTZ2gn/PRWQqY7di2V4ECOYIdLE0+04E42TwVzEy+WKIVICkG7PjKcYoMSWks2EVDiaQiVuxioE1SExtmfh3YntfMByBEljYMZn4Z2J5+mE0gTJYSNGZev79J38y8RddLlixUdtFRIymByZ6vzZEnyd+Aylc09CJki/ah858d8ECOHLA88okGjL8UOvEVgKlmHMytPgfGnyOhkCPegqP3+DEcCaGQI5AptYFuLR+h6nAkhFDoIhT2klQdCUuS/rsXljrdoAghynRLsl6++wWUkFffJlU41AAAAABJRU5ErkJggg==),auto";

const zoomInIcon = "url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAMAAADXqc3KAAAAA3NCSVQICAjb4U/gAAAACXBIWXMAAAEwAAABMAGW7EZ5AAAAGXRFWHRTb2Z0d2FyZQB3d3cuaW5rc2NhcGUub3Jnm+48GgAAASBQTFRF////////////4+Pj6urq5+fn5eXl5ubm5+fn4ujo5OTk9bRa5eXl4ubm4+fn5enp5ejo4+bm5Ofn9bRY5ejo4+jo5efn5Ojo87Na5Ofn5Obm5ebm5Ofn5Ojo4+fn5ejo6KtW5Ofn5Ofn5efn4+jo5Obm9LNZ5Ofn46dU5Ofn9LRZ5Obm48um4+fn5Mqm5Ofn5Ofn5Ofn5Ofn5Ofn4+fn5Ofn5Ofn5Ofn5Ofn5OfnPbOeP7SfXL6tXL+thM3ApdrQyOfhyefi26JQ26NS3Ktk4aZS4adU4tnI4/Du4/Hu5Ofn5ejo5ujo5unp5+rq6Ovr6evr6uzs7O7u7e/v7vDw7vX08PLy8fLy8vPz8vT09LRZ9Pb29fb29ff39vf39/j4UpPm1gAAADp0Uk5TAAEDCQwVHR8gLDAzOz4/RU1SVGJjZHV6gIKFh42PlKSkqq23ubq9vsDH1trd3t/f4Orr7PHy9vr9/qPt2wcAAAEsSURBVBgZbcEJOwJRGAbQTwnZdyP7kiW7KG5FlsgbKtN6W97//y/MnSbx6BxxDUwtbZ9Hwyuzg/LH8D48Z5Pyy8I1kP+qVO1CDrdrfumaBz7qdDUKwIZ4hq5QbLOrBMxIxy4+2uwp4iIgxgRQp3GXKtPRekdIjEXk6VLqgYaNsBhb+KJLqTSNKqJinKBC8k65kmWyCYyI4xJVkinlSryRbSAojh3YJMsPaaXu01mSNcR84lhGgS6l0jRKOBRjGrkGjWQiS+MT62L4j1CgUc7SsBEfFdf4DUr8UQeOxbMKFFvssIHXF0s6/BvAu11ttmulT+D1OaMt8cxcwBM/fXrMaG2JJxAKR4HY4fqoHDxmtNaW9IwEfWIcZLRjTv7b1I6I9GFprfekn7nI3tg3KKZsSAoO0MAAAAAASUVORK5CYII=),auto";


window.onkeydown = e => {
    if (e.ctrlKey || e.altKey) {
        document.body.style.cursor = zoomOutIcon;
    } else {
        document.body.style.cursor = zoomInIcon;
    }
}

window.onkeyup = e => {
    if (!e.ctrlKey && !e.altKey) {
        document.body.style.cursor = zoomInIcon;
    }
}

window.onmousedown = e => {
    const ele = document.getElementById('main')
    const zoom = ele.style.zoom ? parseInt(ele.style.zoom.replace("%", "")) : 100
    if (e.ctrlKey || e.altKey) {
        ele.style.zoom = `${zoom - 10}%`;
    } else {
        ele.style.zoom = `${zoom + 10}%`;
    }
}
