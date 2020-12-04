<?php

$encodedBorder = file_get_contents('../json/countryBorders.geo.json');

$border = json_decode($encodedBorder, true);

$features = $border['features'];

$iso3Array = array();
$nameArray = array();

class countryArray {
  public $names;
  public $iso3;
}

$countries = new countryArray;

foreach($features as $feature) {
  $iso3 = $feature['properties']['iso_a3'];
  $name = $feature['properties']['name'];
  array_push($iso3Array, $iso3);
  array_push($nameArray, $name); 
}
$countries->names = $nameArray;
$countries->iso3 = $iso3Array;

echo json_encode($countries);
?>