# TextShield AI Data Cleaning Tool

🌐 **Live Demo:** Hosted on [textshieldai.me](https://textshieldai.me)

Welcome to the **TextShield AI Data Cleaning Tool**! This is a modern, fast, and secure browser-based application designed to help you quickly process, clean, visualize, and export your datasets without needing any complicated backend pipelines. 

## Features

- **In-Browser Processing:** All data processing happens securely locally in your browser—no data is sent to external servers.
- **Support for Large Files:** Easily drag and drop CSV or Excel (`.xlsx`, `.xls`) files.
- **Automated Data Cleaning:**
  - Detect and remove duplicate rows with one click.
  - Find missing values and impute them using mean, median, mode, or custom values.
  - Drop entire rows with missing data.
- **Data Transformation & Manipulation:**
  - Rename columns and cast data types (numeric, categorical).
  - Find and replace text features (Supports Regex).
  - Normalize or standardize numeric fields.
  - Drop unwanted columns.
- **Exploratory Data Analysis (EDA):**
  - Interactive Preview Table with search capabilities.
  - Instant visual summary statistics (Min, Max, Mean, Types, Missing values).
  - **Visualization Studio**: Generate dynamic charts including Histograms, Bar Charts, Box Plots, and Correlation Heatmaps to understand your data better.
- **Export Options:** Download your cleaned dataset in CSV, Excel, or JSON format.

## Technology Stack

- **UI/Styling:** HTML5, Tailwind CSS
- **Data Processing:** PapaParse (CSV), SheetJS/XLSX (Excel), Simple Statistics
- **Visualization:** Chart.js, Chartjs-chart-boxplot, Chartjs-chart-matrix

## Run Locally

If you'd like to run the Data Cleaning Tool locally on your machine:

1. Clone the repository:
   ```bash
   git clone https://github.com/AyushGupta1332/TextShield-AI-Data-Cleaning-Tool.git
   ```
2. Navigate to the project directory:
   ```bash
   cd TextShield-AI-Data-Cleaning-Tool
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Start the local server:
   ```bash
   npm start
   ```
   *(Ensure you have Node.js installed)*
5. Open your browser and navigate to the localhost URL provided by the server.

---
**TextShieldAI** • Processed securely in your browser.
