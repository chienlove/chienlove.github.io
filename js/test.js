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