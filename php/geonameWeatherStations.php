<?php

$executionStartTime = microtime(true) / 1000;

$url = 'http://api.geonames.org/weatherJSON?north=' . $_REQUEST['boundingBox']['north'] . '&south=' . $_REQUEST['boundingBox']['south'] . '&east=' . $_REQUEST['boundingBox']['east'] . '&west=' . $_REQUEST['boundingBox']['west'] . '&username=felipedesenco&maxRows=24';


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
$output['data'] = $decode['weatherObservations'];
	
header('Content-Type: application/json; charset=UTF-8');

echo json_encode($output);

?>