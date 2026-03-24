# 🌱 TwinFarm: Digital Twin Platform for Coriander Farm Management

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-F7DF1E.svg)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![Three.js](https://img.shields.io/badge/Three.js-r128-green.svg)](https://threejs.org/)
[![FIWARE](https://img.shields.io/badge/FIWARE-Ready-blue.svg)](https://www.fiware.org/)
[![JKUAT](https://img.shields.io/badge/JKUAT-Final%20Year%20Project-0A7B42.svg)](https://www.jkuat.ac.ke/)

---

## 📋 Table of Contents
- [Project Overview](#project-overview)
- [Key Features](#key-features)
- [Technology Stack](#technology-stack)
- [System Architecture](#system-architecture)

## 🎯 Project Overview

**TwinFarm** is a Digital Twin platform designed specifically for **coriander farm management** in Kenya. The platform creates a virtual, real-time replica of physical coriander farms, integrating IoT sensor data, satellite imagery (NDVI), weather APIs, and machine learning predictions to enable data-driven farming decisions.

This project was developed as a **Final Year Project** at **Jomo Kenyatta University of Agriculture and Technology (JKUAT)** , Department of Computing. It addresses the critical challenge faced by coriander farm managers who lack real-time monitoring tools and predictive insights, forcing reactive farming practices that lead to water waste and reduced yields.

### 🚜 The Problem
Coriander farm managers in Kenya operate with minimal technological support, relying on visual inspection and traditional knowledge. This leads to:
- **40-60% water waste** through inefficient irrigation
- **Limited visibility** into crop health and soil conditions
- **Unpredictable yields** due to lack of forecasting
- **Climate vulnerability** with no adaptation tools

### 💡 Our Solution
TwinFarm provides:
- **Real-time farm monitoring** via interactive 3D visualization
- **Predictive analytics** for yield forecasting and irrigation optimization
- **NDVI satellite mapping** for crop health assessment
- **AI-powered farming assistant** for natural language queries
- **Mock data simulation** for development and testing before sensor deployment

---

## ✨ Key Features

### 1. 🌍 Realistic 3D Digital Twin Farm
- Interactive 3D visualization with realistic terrain, crops, and environmental effects
- Clickable fields showing detailed crop health, soil moisture, and yield predictions
- Dynamic camera controls (rotate, zoom, pan)
- Realistic lighting, shadows, and weather effects

### 2. 📊 Real-Time Farm Dashboard
- Live soil moisture, temperature, and crop health monitoring
- Growth stage tracking and harvest countdown
- Weather forecast integration
- Sensor status monitoring

### 3. 🤖 AI Predictions & Simulations
- **Yield Prediction** - Forecast harvest yields with confidence scores
- **Irrigation Optimization** - Smart scheduling to reduce water usage
- **Harvest Timing** - Optimal harvest window predictions
- **Growth Simulator** - Interactive simulation with temperature and moisture controls

### 4. 🗺️ NDVI Satellite Map
- Color-coded vegetation health index overlay
- Field-level NDVI values and health status
- Multiple map views (terrain, satellite)

### 5. 💬 AI Farming Assistant
- Natural language query processing
- Context-aware responses about coriander farming
- Quick questions for common topics
- Expert tips and recommendations

### 6. 🔐 User Authentication
- Demo account for testing (`demo@twinfarm.com` / `demo123`)
- User registration and login simulation
- Role-based access control (ready for backend integration)

---

## 🛠 Technology Stack

| **Category** | **Technology** | **Purpose** |
|--------------|----------------|-------------|
| **Frontend** | HTML5, CSS3, JavaScript | Core web interface |
| | Three.js | Realistic 3D farm visualization |
| | Leaflet.js | Interactive NDVI maps |
| | Chart.js | Data visualization |
| **Backend** | Node.js/Express | RESTful API (planned) |
| | FIWARE Orion | Context broker (planned) |
| | MongoDB/PostgreSQL | Data storage (planned) |
| **Testing** | Jest, Postman, k6 | Unit and load testing |
| **Containerization** | Docker | Deployment consistency |

---

## 🏗 System Architecture


┌─────────────────────────────────────────────────────────────────────────────┐
│ PRESENTATION LAYER │
│ ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────────────────┐ │
│ │ 3D Farm │ │ Dashboard │ │ NDVI Map & Chatbot │ │
│ │ Visualization │ │ Real-time Data │ │ AI Assistant │ │
│ └─────────────────┘ └─────────────────┘ └─────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
│
▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ API LAYER (Planned) │
│ ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────────────────┐ │
│ │ RESTful APIs │ │ Authentication │ │ Data Validation │ │
│ │ /farms, /fields │ │ JWT Tokens │ │ Rate Limiting │ │
│ └─────────────────┘ └─────────────────┘ └─────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
│
▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ DATA INTEGRATION LAYER (FIWARE Ready) │
│ ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────────────────┐ │
│ │ Orion Context │ │ IoT Agent │ │ QuantumLeap │ │
│ │ Broker │ │ (MQTT) │ │ (Time-series DB) │ │
│ └─────────────────┘ └─────────────────┘ └─────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
│
▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ DATA SOURCES │
│ ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────────────────┐ │
│ │ IoT Sensors │ │ Satellite NDVI │ │ Weather APIs │ │
│ │ (Soil, Temp) │ │ (Sentinel-2) │ │ (OpenWeatherMap) │ │
│ └─────────────────┘ └─────────────────┘ └─────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘



