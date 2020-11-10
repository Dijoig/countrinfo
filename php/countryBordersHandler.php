<?php
//getting contents from countryBorders.geo.json decoding and storing in a variable:


$myJSON = json_encode($_REQUEST["countryCode"]);



echo $myJSON;
//storing the iso code from the select element at html in a variable:

?>