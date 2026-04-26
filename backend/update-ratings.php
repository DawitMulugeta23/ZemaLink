<?php
require_once 'config/database.php';
require_once 'services/RatingService.php';

$ratingService = new RatingService($pdo);
$count = $ratingService->updateAllRatings();

echo "Updated ratings for $count songs!\n";
?>