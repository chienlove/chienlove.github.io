function compatible(works_min, works_max, tweak_compatibility) {
    let currentiOS = parseFloat(('' + (/CPU.*OS ([0-9_]{1,})|(CPU like).*AppleWebKit.*Mobile/i.exec(navigator.userAgent) || [0,''])[1]).replace('undefined', '3_2').replace('_', '.').replace('_', ''));
    works_min = numerize(works_min);
    works_max = numerize(works_max);
    let el = document.querySelector(".compatibility");
    if (currentiOS < works_min) {
        el.innerHTML = "Phiên bản iOS của bạn quá cũ đối với công cụ này. Chỉ hoạt động trên " + tweak_compatibility + ".";
        el.classList.add("red")
    } else if(currentiOS > works_max) {
        el.innerHTML = "Phiên bản iOS của bạn quá mới đối với công cụ này. Chỉ hoạt động trên " + tweak_compatibility + ".";
        el.classList.add("red")
    } else if(String(currentiOS) != "NaN") {
        el.innerHTML = "Phiên bản iOS của bạn được hỗ trợ 😊";
        el.classList.add("green")
    }

}
function numerize(x) {
    return x.substring(0,x.indexOf(".")) + "." + x.substring(x.indexOf(".")+1).replace(".","")
}
function swap(hide, show) {
    for (var i = document.querySelectorAll(hide).length - 1; i >= 0; i--) {
        document.querySelectorAll(hide)[i].style.display = "none";
    }
    for (var i = document.querySelectorAll(show).length - 1; i >= 0; i--) {
        document.querySelectorAll(show)[i].style.display = "block";
    }
    document.querySelector(".nav_btn" + show + "_btn").classList.add("active");
    document.querySelector(".nav_btn" + hide + "_btn").classList.remove("active")
}

function externalize() {
    
}
function darkMode(isOled) {
    var darkColor = isOled ? "black" : "#161616";
    document.querySelector("body").style.color = "white";
    document.querySelector("body").style.background = darkColor;
    for (var i = document.querySelectorAll(".subtle_link, .subtle_link > div > div, .subtle_link > div > div > p").length - 1; i >= 0; i--) {
        document.querySelectorAll(".subtle_link, .subtle_link > div > div, .subtle_link > div > div > p")[i].style.color = "white";
    }
}
if (navigator.userAgent.toLowerCase().indexOf("dark") != -1) {
    darkMode(navigator.userAgent.toLowerCase().indexOf("oled") != -1);
}

function myFunction() {
  // Declare variables
  var input, filter, ul, li, div, h1, i, txtValue;
  input = document.getElementById('myInput');
  filter = input.value.toUpperCase();
  ul = document.getElementById("myUL");
  li = ul.getElementsByTagName('li');


  for (i = 0; i < li.length; i++) {
    h3 = li[i].getElementsByClassName("item-title")[0];
    txtValue = h3.textContent || h3.innerText;
    if (txtValue.toUpperCase().indexOf(filter) > -1) {
      li[i].style.display = "";
    } else {
      li[i].style.display = "none";
    }
  }
}