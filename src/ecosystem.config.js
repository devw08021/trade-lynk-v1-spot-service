module.exports = {
    apps: [
        {
            name: "primary",
            script: "./server.js",
            exec_mode: "cluster",
            instances: "1",
            node_args: "--max-old-space-size=16384",
            ignore_watch: [
                "./node_modules",
            ],
            "log_date_format": "DD-MM-YYYY HH:mm:ss",
            "cron_restart": "0 4 * * *",
            "max_memory_restart": "3G"
        },
        {
            name: "replica",
            script: "./server.js",
            exec_mode: "cluster",
            instances: "1",
            node_args: "--max-old-space-size=16384",
            ignore_watch: [
                "./node_modules",
            ],
            "log_date_format": "DD-MM-YYYY HH:mm:ss",
            "cron_restart": "0 4 * * *",
            "max_memory_restart": "3G"
        }
    ]
};