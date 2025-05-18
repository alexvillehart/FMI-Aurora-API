// OpenTelemetry configuration for metrics and logging
import { resourceFromAttributes } from '@opentelemetry/resources'
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions'
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http'
import { MeterProvider, PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics'
import { metrics } from '@opentelemetry/api'
import { registerInstrumentations } from '@opentelemetry/instrumentation'
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http'
import { ExpressInstrumentation } from '@opentelemetry/instrumentation-express'
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http'
import { LoggerProvider, BatchLogRecordProcessor } from '@opentelemetry/sdk-logs'
import { SeverityNumber } from '@opentelemetry/api-logs'
import dotenv from 'dotenv'
dotenv.config()

// Environment variables with defaults
const SERVICE_NAME = process.env.OTEL_APP_NAME || 'otel-logging-default'
const OTEL_COLLECTOR_ADDRESS = process.env.OTEL_ADDRESS || 'localhost'
const OTEL_COLLECTOR_URL = `http://${OTEL_COLLECTOR_ADDRESS}:4318`

// Shared resource configuration
const resource = resourceFromAttributes({
    [ATTR_SERVICE_NAME]: SERVICE_NAME
})

// Metrics counters
let requestCounter
let errorCounter

// Initialize OpenTelemetry logging
const initializeLogging = () => {
    const logExporter = new OTLPLogExporter({
        url: `${OTEL_COLLECTOR_URL}/v1/logs`,
        concurrencyLimit: 1
    })

    const loggerProvider = new LoggerProvider({ resource })
    loggerProvider.addLogRecordProcessor(new BatchLogRecordProcessor(logExporter))

    // Initialize default logger
    const otelLogger = loggerProvider.getLogger('default', '1.0.0')
    return {
        debug: (body, attributes = {}) =>
            otelLogger.emit({
                severityNumber: SeverityNumber.DEBUG,
                severityText: 'DEBUG',
                body,
                attributes
            }),
        info: (body, attributes = {}) =>
            otelLogger.emit({
                severityNumber: SeverityNumber.INFO,
                severityText: 'INFO',
                body,
                attributes
            }),
        error: (body, attributes = {}) =>
            otelLogger.emit({
                severityNumber: SeverityNumber.ERROR,
                severityText: 'ERROR',
                body,
                attributes
            }),
        warn: (body, attributes = {}) =>
            otelLogger.emit({
            severityNumber: SeverityNumber.WARN,
            severityText: 'WARN',
            body,
            attributes
            }),
    }
}

const logger = initializeLogging()

// Initialize OpenTelemetry metrics and instrumentation
const initializeMetrics = () => {
    try {
        const metricExporter = new OTLPMetricExporter({
            url: `${OTEL_COLLECTOR_URL}/v1/metrics`,
            concurrencyLimit: 1
        })

        const meterProvider = new MeterProvider({
            resource,
            readers: [
                new PeriodicExportingMetricReader({
                    exporter: metricExporter,
                    exportIntervalMillis: 1000
                })
            ]
        })

        metrics.setGlobalMeterProvider(meterProvider)

        // Create meter for Express API
        const meter = meterProvider.getMeter('express-api-meter')

        // Initialize counters
        requestCounter = meter.createCounter('http_requests_total', {
            description: 'Total number of HTTP requests'
        })

        errorCounter = meter.createCounter('http_errors_total', {
            description: 'Total number of HTTP errors (4xx, 5xx)'
        })

        // Register HTTP and Express instrumentations
        registerInstrumentations({
            instrumentations: [
                new HttpInstrumentation(),
                new ExpressInstrumentation()
            ]
        })
        logger.info('Successfully initialized metrics')
    } catch (exception) {
        logger.error(`Failed to initialize Metrics`)
        console.error(exception)
    }
}

// Express middleware for request metrics
const metricsMiddleware = (req, res, next) => {
    try {
        const startTime = Date.now()
        res.on('finish', () => {
            const duration = (Date.now() - startTime) / 1000
            const labels = {
                method: req.method,
                path: req.path,
                status: res.statusCode
            }

            requestCounter.add(1, labels)

            if (res.statusCode >= 400) {
                errorCounter.add(1, labels)
            }
        })

        next()
    } catch(exception) {
        logger.error(`metrics middleware fails ${exception}`)
        next()
    }
}

// Initialize OpenTelemetry
const initializeOpenTelemetry = () => {
    initializeMetrics()
}

// Export initialization function and middleware
export { initializeOpenTelemetry, metricsMiddleware, logger }