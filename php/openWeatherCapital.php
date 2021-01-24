<?php

$executionStartTime = microtime(true) / 1000;

$url = 'http://api.openweathermap.org/data/2.5/weather?q=' . $_REQUEST['city'] . '&appid=220291cb42a0e8f00f363d8f1cdc189b';


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
$output['data'] = $decode['coord'];
	
header('Content-Type: application/json; charset=UTF-8');

echo json_encode($output);

?>