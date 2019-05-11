<?php
#ini_set('display_errors', 1);
#ini_set('display_startup_errors', 1);
#error_reporting(E_ALL);

setlocale(LC_MONETARY, 'en_GB');

$priceType = $_GET['pricetype'] ?? 'Average';

$validPriceTypes = ['Lowest','Average','Highest'];
if (!in_array($priceType, $validPriceTypes,true)) {
    die('Invalid Price Type');
}



$divider = '------------------';


$data = file_get_contents('../data.txt');
$data = substr($data, strlen($divider));
$data = explode($divider, $data);
$final_data = [];


array_walk($data, function($val) use (&$final_data) {
    $val = trim($val, "\n");
    $val = explode("\n", $val);

    $key = array_shift($val);
    $key = substr($key, 6);

    $final_data[$key] = [];

    array_walk($val, function ($v) use (&$final_data, &$key) {
        $v = explode(' - ', $v);
        $year = array_shift($v);

        $final_data[$key][$year] = [];

        array_walk($v, function($val) use (&$final_data, &$year, &$key) {
            list($type, $price) = explode(': ', $val);
            $final_data[$key][$year][$type] = $price;
        });
    });
});

unset($data);
$data = $final_data;

$cronDates = array_keys($data);
$years = array_keys($data[$cronDates[0]]);

//echo '<pre>';
//print_r($data);
//echo '</pre>';
//die;

$rows = [];
array_walk($data, function($val,$key) use (&$rows, $priceType) {
    $res = array($key);
    foreach (array_keys($val) as $k) {
        $res[] = (float)$val[$k][$priceType];
    }
    $rows[] = $res;
});

$avgs = [];
foreach ($years as $k => $year) {
    $avg = array_reduce($rows, function ($a,$b) use ($k) {
        return $a + $b[$k+1];
    }, 0);
    $avg /= count($rows);

    $avgs[$year] = $avg;
}

?>

<html>
<head>
    <script type="text/javascript" src="https://www.gstatic.com/charts/loader.js"></script>
    <script type="text/javascript">
        google.charts.load('current', {'packages':['line']});
        google.charts.setOnLoadCallback(drawChart);

        function drawChart() {

            var data = new google.visualization.DataTable();
            data.addColumn('string', 'Day');
            <?php foreach($years as $year):
                $avg = money_format('%n', $avgs[$year]);
            ?>
            data.addColumn('number', '<?php echo "$year - $avg" ?>');
            <?php endforeach; ?>

            var rows = JSON.parse('<?php echo json_encode($rows); ?>');
            data.addRows(rows);

            var options = {
                chart: {
                    title: '<?php echo $priceType ?> Focus RS Price'
                },
                width: 900,
                height: 500
            };

            var chart = new google.charts.Line(document.getElementById('linechart_material'));

            chart.draw(data, google.charts.Line.convertOptions(options));
        }
    </script>
    <style>
        button {
            border: 0;
            background: #dcdcdc;
            color: black;
            text-transform: uppercase;
            font-weight: bold;
            padding: 0;
            text-align: center;
            margin: 0 15px 0 0;

            box-sizing: border-box;
        }
        a {
            padding: 10px 25px;
            display: block;
            width: 100%;
            height: 100%;
            color: black;
                box-sizing: border-box;
        }
    </style>
</head>
<body>
<div style="margin-bottom: 35px;">
    <p>Select Graph Price Value</p>
    <?php foreach ($validPriceTypes as $type): ?>
        <button><a href="?pricetype=<?php echo $type?>"><?php echo $type?></a></button>
    <?php endforeach;?>
</div>
<hr/>
<div id="linechart_material" style="width: 900px; height: 500px"></div>
</body>
</html>
