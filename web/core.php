<?php

class Car_Pricing
{
    const LIVE_DOMAIN = 'samdjames.uk';

    protected $data_file_path;
    protected $debug_mode;
    protected $initial_reporting_level;
    protected $divider;

    protected $vehicleName = '{vehicle_name}';

    public $years;
    public $rows;
    public $averages;
    public $price_types = ['Lowest','Average','Highest'];

    public function __construct(
        string $data_file_path,
        bool $debug_mode = null,
        string $divider = '------------------'
    )
    {
        // Setup our params
        $this->initial_reporting_level = error_reporting();
        $this->data_file_path = $data_file_path;
        $this->debug_mode = $debug_mode;
        $this->divider = $divider;

        // SET PHP Level bits
        setlocale(LC_MONETARY, 'en_GB');
        if($this->getDebugMode()) {
            $this->changeDebugMode(true);
        }
    }

    public function process()
    {
        // Check price type
        if (!$this->isValidPriceType($this->getAppliedPriceType())) {
            $this->badRequest('Invalid Price Type');
        }

        $this->processData();
        $this->loadView();
    }

    public function loadView()
    {
        require_once 'view.phtml';
    }

    public function getVehicleName()
    {
        return $this->vehicleName;
    }

    public function processData()
    {
        $fileData = $this->loadFromFile();
        $executions = $this->splitDataIntoExecutions($fileData);
        $data = $this->processExecutions($executions);

        $this->years = $this->extractYearsFromData($data);
        $this->rows = $this->processRows($data);
        $this->averages = $this->processAverages($this->rows, $this->years);
    }

    public function extractYearsFromData($data) : array
    {
        $cronDates = array_keys($data);
        return array_keys($data[$cronDates[0]]);
    }

    public function processAverages(array $rows, array $years) : array
    {
        $avgs = [];
        foreach ($years as $k => $year) {
            $avg = array_reduce($rows, function ($a, $b) use ($k) {
                return $a + $b[$k+1];
            }, 0);
            $avg /= count($rows);

            $avgs[$year] = $avg;
        }

        return $avgs;
    }

    public function processRows(array $data) : array
    {
        $rows = [];
        $priceType = $this->getAppliedPriceType();
        array_walk($data, function($val,$key) use (&$rows, $priceType) {
            $res = array($key);
            foreach (array_keys($val) as $k) {
                $res[] = (float)$val[$k][$priceType];
            }
            $rows[] = $res;
        });
        return $rows;
    }

    public function processExecutions(array $executions) : array
    {
        $final_data = [];
        array_walk($executions, function($val) use (&$final_data) {
            $val = trim($val, "\n");
            $val = explode("\n", $val);

            $key = array_shift($val);

            // Strip off the postcode bit on the same line
            $key = explode(' ', substr($key, 6))[0];

            // Drop vehicle type data
            $this->vehicleName = array_shift($val);

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
        return $final_data;
    }

    public function splitDataIntoExecutions(string $data) : array
    {
        $data = substr($data, strlen($this->divider));
        return explode($this->divider, $data);
    }

    public function loadFromFile() : string
    {
        $cnt = file_get_contents($this->data_file_path);
        return is_string($cnt) ? $cnt : '';
    }

    public function badRequest(string $reason = '') : void
    {
        header('HTTP/1.1 400 BAD REQUEST');
        echo json_encode([
            'success' => false,
            'code'    => 400,
            'message' => $reason
        ]);
        exit;
    }

    public function isValidPriceType(string $type) : bool
    {
        return in_array($type, $this->price_types, true);
    }

    public function getAppliedPriceType() : string
    {
        return $_GET['pricetype'] ?? 'Average';
    }

    public function changeDebugMode($mode) : self
    {
        ini_set('display_errors', $mode ? 1 : 0);
        ini_set('display_startup_errors', $mode ? 1 : 0);
        error_reporting($mode ? E_ALL : $this->initial_reporting_level);
        return $this;
    }

    public function setDebugMode(bool $mode) : self
    {
        $this->debug_mode = $mode;
        return $this;
    }

    public function getDebugMode() : bool
    {

        return $this->debug_mode ?? $this->getDebugModeFromDomain();
    }

    public function getDebugModeFromDomain()
    {
        return $this->isProduction();
    }

    public function isProduction()
    {
        return stripos($_SERVER['HTTP_HOST'], self::LIVE_DOMAIN) !== -1;
    }
}