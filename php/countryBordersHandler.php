<?php

//storing the properties countryCode from the global request variable from the ajax request:
$countryCode = $_REQUEST['countryCode'];
//getting contents from countryBorders.geo.json decoding and storing in a variable:
$encodedBorder = file_get_contents('../json/countryBorders.geo.json');

$border = json_decode($encodedBorder, true);

$features = $border['features'];

//logic to match the iso chosen from the nav bar to the right contry in countryBorders.geo.json:
foreach($features as $feature) {
  $iso3 = $feature['properties']['iso_a3'];
  if ($countryCode == $iso3) {
    $countryGeoJson = $feature;
    //outputing the right coordinates:
    $output = json_encode($countryGeoJson);
    echo $output;
  }
  
  
}


?>