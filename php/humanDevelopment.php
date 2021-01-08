<?php

$executionStartTime = microtime(true) / 1000;

$url = 'http://ec2-54-174-131-205.compute-1.amazonaws.com/API/HDRO_API.php/country_code=' . $_REQUEST['countryCode'] . '/indicator_id=137506,69206,140606,195706,146206/year=2019/structure=ciy';


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
$output['data'] = $decode;
	
header('Content-Type: application/json; charset=UTF-8');

echo json_encode($output);

?>