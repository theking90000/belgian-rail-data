# Belgian rail data

The scope of this application is to constitute a database of belgian rail train informations. This application contains tools to track and monitor vehicles and user-defined journey. It collects informations about current trains compositions, delays, platform changes over the time.

This tool can be combined with different programs to create statistics and data analysis over public belgian railway data. It leverages the [iRail API](<(https://docs.irail.be)>) to monitor train connections, track vehicles from SNCB/NMBS

## Features

- **Connection Search**: Find train connections between stations with real-time data
- **Vehicle Tracking**: Monitor specific trains and collect historical data
- **Automated Scheduling**: Continuous data collection through automated scheduling
- **Web API**: RESTful API server for accessing collected data
- **Station Analytics**: View all trains passing through specific stations
- **Rate-Limited API Access**: Intelligent rate limiting for iRail API compliance

## Local development

### Prerequisites

- [Bun](https://bun.sh/) runtime

### Installation

1. Clone the repository:

```bash
git clone https://github.com/theking90000/belgian-rail-data.git
cd belgian-rail-data
```

2. Install dependencies:

```bash
bun install
```

3. Configure tracked vehicles and API keys in `tracked.json`:

```json
{
  "vehicles": ["IC1234", "S51567"],
  "api_keys": ["your-api-key-here"]
}
```

4. Run the application:

```bash
bun start
```

## Usage

### Command Line Interface

#### Find Connections

Search for train connections between two stations:

```bash
bun start --from "Brussels-Central" --to "Antwerp-Central"
bun start --from "Gent-Sint-Pieters" --to "Brussels-South" --date "290825" --time "1430"
```

#### Start the Scheduler

Enable automated vehicle tracking:

```bash
bun start --scheduler
```

#### Wake the Scheduler

Trigger an immediate data collection cycle:

```bash
bun start --wake
```

#### Start the Web Server

Launch the API server:

```bash
bun start --server
```

### Web API Endpoints

The web server provides several REST endpoints:

- `GET /tracked` - List all tracked vehicles with their information
- `GET /stops?id=<vehicle_id>&date=<date>` - Get stops for a specific vehicle on a given date
- `GET /station?station=<station_name>&date=<date>` - Get all trains passing through a station

Example:

```bash
curl http://localhost:3000/tracked
curl "http://localhost:3000/stops?id=IC1234&date=290825"
curl "http://localhost:3000/station?station=Brussels-Central&date=290825"
```

## Configuration

### Environment Variables

- `PORT` - Server port (default: 3000)
- `HOST` - Server hostname (default: 0.0.0.0)

### Configuration Files

- `tracked.json` - Contains vehicles to track and API keys
- `config.db` - SQLite database for configuration
- `data.db` - SQLite database for collected train data
- `logs.db` - SQLite database for application logs

## Building

### Development

```bash
bun start
```

### Production Build

Build standalone executables:

```bash
./build.sh
```

This creates:

- `target/sncb-insights-0.1.0-linux-x64` - Linux x64 executable

### Deployment

For Linux VPS deployment, use the installation script:

```bash
./install.sh [user@]hostname [ssh-options]
```

This script automates the deployment process including:

- Remote server setup
- Dependency installation
- Service configuration
- Systemd service creation

## Data Collection

The scheduler automatically:

- Fetches vehicle data for tracked trains
- Collects historical data (up to 2 days back)
- Handles delays and scheduling conflicts
- Respects API rate limits
- Stores data in structured SQLite databases

## License

This project is private and proprietary.

## Acknowledgments

- [iRail API](https://api.irail.be/) for providing Belgian railway data
- [Bun](https://bun.sh/) for the fast JavaScript runtime
- [SNCB](https://www.belgiantrain.be/) for the railway services
