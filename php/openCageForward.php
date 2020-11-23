<?php

$executionStartTime = microtime(true) / 1000;

$countryName = str_replace(' ', '%20', $_REQUEST['countryName']);

$url = 'https://api.opencagedata.com/geocode/v1/json?q=' . $countryName . '&key=b98ae14b498242088c9223278341c842';


$ch = curl_init();
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_URL, $url);

$result = curl_exec($ch);

curl_close($ch);
  
$decode = json_decode($result, true);

$output['status']['code'] = "200";
$output['status']['name'] = "ok";
$output['status']['description'] = "mission saved";
$output['status']['returnedIn'] = (microtime(true) - $executionStartTime) / 1000 . " ms";
$output['data'] = $decode['results'];
	
header('Content-Type: application/json; charset=UTF-8');

echo json_encode($output);

?>