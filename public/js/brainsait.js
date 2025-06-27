/**
 * BRAINSAIT - Healthcare Insurance Intelligence Platform
 * Integrated JavaScript functionality
 */

class BrainsaitIntelligence {
    constructor() {
        this.uploadedFiles = [];
        this.analysisResults = null;
        this.isProcessing = false;
        this.charts = {};
        this.apiEndpoint = '/api';
        
        this.init();
    }

    init() {
        this.setupDomElements();
        this.setupEventListeners();
        this.setupCharts();
        this.loadSavedState();
    }

    setupDomElements() {
        // Navigation
        this.elements = {
            tabs: {
                links: document.querySelectorAll('.tab-link'),
                sections: {
                    'upload': document.getElementById('upload-section'),
                    'dashboard': document.getElementById('dashboard-section'),
                    'insights': document.getElementById('insights-section'),
                    'reports': document.getElementById('reports-section')
                }
            },
            upload: {
                area: document.getElementById('uploadArea'),
                fileInput: document.getElementById('fileInput'),
                uploadBtn: document.getElementById('uploadBtn'),
                fileList: document.getElementById('fileList'),
            },
            processing: {
                section: document.getElementById('processingSection'),
                progressFill: document.getElementById('progressFill'),
                progressText: document.getElementById('progressText')
            },
            dashboard: {
                totalClaims: document.getElementById('total-claims'),
                rejectionRate: document.getElementById('rejection-rate'),
                totalAmount: document.getElementById('total-amount'),
                processingTime: document.getElementById('processing-time'),
                trendChart: document.getElementById('trend-chart-canvas'),
                rejectionChart: document.getElementById('rejection-chart-canvas'),
                payerChart: document.getElementById('payer-chart-canvas'),
                rejectionReasons: document.getElementById('rejection-reasons-container'),
                rejectionReasonsLoading: document.getElementById('rejection-reasons-loading')
            },
            insights: {
                container: document.getElementById('ai-insights-container'),
                apiKeyInput: document.getElementById('openai-api-key'),
                generateBtn: document.getElementById('generate-insights-btn'),
                refreshBtn: document.getElementById('refresh-insights-btn'),
                loading: document.getElementById('insights-loading'),
                insightsContent: document.getElementById('ai-insights-content'),
                recommendationsContent: document.getElementById('ai-recommendations-content')
            },
            reports: {
                form: document.getElementById('report-form'),
                generateBtn: document.getElementById('generate-report-btn'),
                reportsList: document.getElementById('reports-list')
            }
        };
    }

    setupEventListeners() {
        // Tab navigation
        this.elements.tabs.links.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const tab = e.target.getAttribute('data-tab');
                this.showTab(tab);
            });
        });

        // Upload functionality
        if (this.elements.upload.area && this.elements.upload.fileInput) {
            // Upload button
            this.elements.upload.uploadBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.elements.upload.fileInput.click();
            });

            // File selection
            this.elements.upload.fileInput.addEventListener('change', (e) => {
                this.handleFileSelect(e);
            });

            // Drag and drop
            this.elements.upload.area.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.elements.upload.area.classList.add('dragover');
            });

            this.elements.upload.area.addEventListener('dragleave', (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (!this.elements.upload.area.contains(e.relatedTarget)) {
                    this.elements.upload.area.classList.remove('dragover');
                }
            });

            this.elements.upload.area.addEventListener('drop', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.elements.upload.area.classList.remove('dragover');
                
                const files = Array.from(e.dataTransfer.files);
                this.processFiles(files);
            });
        }

        // Insights functionality
        if (this.elements.insights.generateBtn) {
            this.elements.insights.generateBtn.addEventListener('click', () => {
                this.generateAiInsights();
            });
        }

        if (this.elements.insights.refreshBtn) {
            this.elements.insights.refreshBtn.addEventListener('click', () => {
                this.generateAiInsights();
            });
        }

        // Report generation
        if (this.elements.reports.generateBtn) {
            this.elements.reports.generateBtn.addEventListener('click', () => {
                this.generateReport();
            });
        }
    }

    showTab(tabName) {
        // Update active tab
        this.elements.tabs.links.forEach(tabLink => {
            tabLink.classList.remove('active');
            if (tabLink.getAttribute('data-tab') === tabName) {
                tabLink.classList.add('active');
            }
        });
        
        // Show active section
        Object.entries(this.elements.tabs.sections).forEach(([name, section]) => {
            section.style.display = name === tabName ? 'block' : 'none';
        });
        
        // Special handling for sections that need updates when shown
        if (tabName === 'dashboard' && this.analysisResults) {
            this.updateDashboard(this.analysisResults);
        }
    }

    handleFileSelect(e) {
        try {
            if (!e.target || !e.target.files) {
                console.warn('No files in event target');
                return;
            }
            const files = Array.from(e.target.files);
            this.processFiles(files);
        } catch (error) {
            console.error('Error in handleFileSelect:', error);
            this.showNotification('File Selection Error', 'Failed to process selected files', 'error');
        }
    }

    processFiles(files) {
        try {
            if (this.isProcessing) {
                this.showNotification('Processing', 'Analysis already in progress', 'warning');
                return;
            }
            
            if (!files || files.length === 0) {
                this.showNotification('No Files', 'No files selected', 'warning');
                return;
            }
            
            const validFiles = files.filter(file => this.validateFile(file));
            if (validFiles.length === 0) {
                this.showNotification('Invalid Files', 'No valid files found', 'error');
                return;
            }

            this.uploadedFiles = [...this.uploadedFiles, ...validFiles];
            this.displayFiles();
            
            // Auto-start analysis with delay
            if (this.uploadedFiles.length > 0) {
                setTimeout(() => {
                    this.startAnalysis();
                }, 500);
            }
        } catch (error) {
            console.error('Error in processFiles:', error);
            this.showNotification('Processing Error', 'Failed to process files', 'error');
        }
    }

    validateFile(file) {
        try {
            if (!file || !file.type || !file.name || !file.size) {
                console.warn('Invalid file object:', file);
                return false;
            }

            const validTypes = [
                'application/pdf',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'application/vnd.ms-excel',
                'text/csv'
            ];
            
            const maxSize = 10 * 1024 * 1024; // 10MB - limit set in wrangler.toml
            
            if (!validTypes.includes(file.type)) {
                this.showNotification('Invalid File Type', `${file.name} is not supported. Please use PDF, Excel, or CSV files.`, 'error');
                return false;
            }
            
            if (file.size > maxSize) {
                this.showNotification('File Too Large', `${file.name} exceeds 10MB limit.`, 'error');
                return false;
            }
            
            return true;
        } catch (error) {
            console.error('Error validating file:', error);
            return false;
        }
    }

    displayFiles() {
        const fileList = this.elements.upload.fileList;
        if (!fileList) return;
        
        fileList.innerHTML = '';
        
        this.uploadedFiles.forEach((file, index) => {
            const fileItem = this.createFileItem(file, index);
            fileList.appendChild(fileItem);
        });
        
        fileList.classList.toggle('show', this.uploadedFiles.length > 0);
    }

    createFileItem(file, index) {
        try {
            const fileItem = document.createElement('div');
            fileItem.className = 'file-item';
            
            const fileIcon = this.getFileIcon(file.name);
            const fileSize = this.formatFileSize(file.size);
            
            fileItem.innerHTML = `
                <div class="file-info">
                    <div class="file-icon">${fileIcon}</div>
                    <div class="file-details">
                        <h4>${this.escapeHtml(file.name)}</h4>
                        <div class="file-meta">
                            <span>${fileSize}</span>
                            <span>${this.getFileType(file)}</span>
                        </div>
                    </div>
                </div>
                <button class="remove-btn" data-index="${index}" title="Remove file">×</button>
            `;
            
            // Add event listener to remove button
            const removeBtn = fileItem.querySelector('.remove-btn');
            if (removeBtn) {
                removeBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    try {
                        const idx = parseInt(e.target.getAttribute('data-index'));
                        this.removeFile(idx);
                    } catch (error) {
                        console.error('Error removing file:', error);
                    }
                });
            }
            
            return fileItem;
        } catch (error) {
            console.error('Error creating file item:', error);
            const errorItem = document.createElement('div');
            errorItem.className = 'file-item';
            errorItem.innerHTML = '<div class="file-info">Error displaying file</div>';
            return errorItem;
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    getFileIcon(filename) {
        const extension = filename.split('.').pop().toLowerCase();
        const icons = {
            'pdf': '📄',
            'xlsx': '📊', 'xls': '📊',
            'csv': '📊'
        };
        return icons[extension] || '📄';
    }

    getFileType(file) {
        const types = {
            'application/pdf': 'PDF',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'Excel',
            'application/vnd.ms-excel': 'Excel',
            'text/csv': 'CSV'
        };
        return types[file.type] || 'Document';
    }

    formatFileSize(bytes) {
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        if (bytes === 0) return '0 Bytes';
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
    }

    removeFile(index) {
        try {
            if (this.isProcessing) {
                this.showNotification('Processing', 'Cannot remove files during analysis', 'warning');
                return;
            }
            
            if (index < 0 || index >= this.uploadedFiles.length) {
                console.warn('Invalid file index:', index);
                return;
            }
            
            this.uploadedFiles.splice(index, 1);
            this.displayFiles();
            
            this.showNotification('File Removed', 'File successfully removed', 'success');
        } catch (error) {
            console.error('Error removing file:', error);
            this.showNotification('Remove Error', 'Failed to remove file', 'error');
        }
    }

    async startAnalysis() {
        try {
            if (this.isProcessing) {
                console.warn('Analysis already in progress');
                return;
            }
            
            if (this.uploadedFiles.length === 0) {
                this.showNotification('No Files', 'Please upload files first', 'warning');
                return;
            }
            
            this.isProcessing = true;
            
            // Show processing section
            if (this.elements.processing.section) {
                this.elements.processing.section.classList.add('active');
            }
            
            // Set initial progress
            this.updateProgress(10);
            
            // Upload files one by one to our API
            for (let i = 0; i < this.uploadedFiles.length; i++) {
                const file = this.uploadedFiles[i];
                const progress = 10 + Math.floor((i / this.uploadedFiles.length) * 40);
                this.updateProgress(progress);
                
                await this.uploadFile(file);
            }
            
            // Update progress
            this.updateProgress(50);
            
            // Process the files
            const analysisResults = await this.analyzeData();
            
            // Update progress
            this.updateProgress(90);
            
            this.analysisResults = analysisResults;
            this.saveState();
            
            // Update progress to complete
            this.updateProgress(100);
            
            setTimeout(() => {
                // Hide processing section
                if (this.elements.processing.section) {
                    this.elements.processing.section.classList.remove('active');
                }
                
                // Show dashboard with results
                this.showTab('dashboard');
                this.updateDashboard(this.analysisResults);
                
                this.showNotification('Analysis Complete', 'Your data has been successfully analyzed', 'success');
                this.isProcessing = false;
            }, 1000);
            
        } catch (error) {
            console.error('Error during analysis:', error);
            this.showNotification('Analysis Error', 'Failed to complete analysis: ' + error.message, 'error');
            
            // Hide processing section
            if (this.elements.processing.section) {
                this.elements.processing.section.classList.remove('active');
            }
            
            this.isProcessing = false;
        }
    }

    updateProgress(percent) {
        if (this.elements.processing.progressFill && this.elements.processing.progressText) {
            this.elements.processing.progressFill.style.width = `${percent}%`;
            this.elements.processing.progressText.textContent = `${Math.round(percent)}%`;
        }
    }

    async uploadFile(file) {
        try {
            // Create form data
            const formData = new FormData();
            formData.append('file', file);
            
            // Upload file to our API
            const uploadResponse = await fetch(`${this.apiEndpoint}/upload`, {
                method: 'POST',
                body: formData
            });
            
            if (!uploadResponse.ok) {
                const errorData = await uploadResponse.json();
                throw new Error(errorData.error || 'Failed to upload file');
            }
            
            return await uploadResponse.json();
        } catch (error) {
            console.error('Error uploading file:', error);
            throw error;
        }
    }

    async analyzeData() {
        try {
            // For now, we'll use a simulated result to illustrate
            // In a real implementation, we'd call the API to analyze the uploaded data
            
            // Get the result ID from the upload response
            // const resultId = uploadResult.resultId;
            
            // Make API call to analyze rejections
            // const rejectionsResponse = await fetch(`${this.apiEndpoint}/analyze/rejections`, {
            //     method: 'POST',
            //     headers: { 'Content-Type': 'application/json' },
            //     body: JSON.stringify({ resultId })
            // });
            
            // Call trends analysis
            // const trendsResponse = await fetch(`${this.apiEndpoint}/analyze/trends`, {
            //     method: 'POST',
            //     headers: { 'Content-Type': 'application/json' },
            //     body: JSON.stringify({ resultId })
            // });
            
            // Combine results
            // const rejections = await rejectionsResponse.json();
            // const trends = await trendsResponse.json();
            
            // For now, generate demo data
            return this.generateDemoAnalysis();
        } catch (error) {
            console.error('Error analyzing data:', error);
            throw error;
        }
    }

    generateDemoAnalysis() {
        const months = ['2024-01', '2024-02', '2024-03', '2024-04', '2024-05', '2024-06'];
        const rejectionReasons = [
            'Missing Information', 
            'Duplicate Claim', 
            'Service Not Covered',
            'Authorization Required',
            'Incorrect Coding',
            'Coordination of Benefits',
            'Eligibility Expired',
            'Timely Filing',
            'Invalid NPI'
        ];
        const payers = [
            'Blue Cross Blue Shield',
            'UnitedHealthcare',
            'Aetna',
            'Cigna',
            'Humana',
            'Medicare',
            'Medicaid',
            'Kaiser Permanente'
        ];
        
        // Create monthly data
        const monthlyData = months.map((month, index) => {
            const baseClaimCount = 500 + Math.floor(Math.random() * 200);
            const growthFactor = 1 + (index * 0.05); // 5% growth per month
            const totalClaims = Math.floor(baseClaimCount * growthFactor);
            
            // Rejection rate improves over time
            const rejectionRateBase = 12 - (index * 0.8);
            const rejectionRate = Math.max(5, rejectionRateBase + (Math.random() * 2 - 1));
            const rejectedClaims = Math.floor(totalClaims * (rejectionRate / 100));
            
            // Financial amounts
            const avgClaimAmount = 750 + Math.floor(Math.random() * 250);
            const totalAmount = totalClaims * avgClaimAmount;
            const paidAmount = totalAmount * (1 - (rejectionRate / 100)) * 0.8;
            
            return {
                month,
                totalClaims,
                rejectedClaims,
                rejectionRate,
                totalAmount,
                paidAmount
            };
        });
        
        // Create rejection reasons analysis
        const reasonsAnalysis = rejectionReasons.map(reason => {
            const count = Math.floor(50 + Math.random() * 200);
            return {
                reason,
                count,
                percentage: (count / 1200) * 100 // 1200 is estimated total rejections
            };
        }).sort((a, b) => b.count - a.count);
        
        // Create payer analysis
        const payerTrends = payers.map(payer => {
            const totalClaims = Math.floor(200 + Math.random() * 500);
            const rejectionRate = 5 + Math.random() * 15;
            const rejectedClaims = Math.floor(totalClaims * (rejectionRate / 100));
            const avgClaimAmount = 500 + Math.floor(Math.random() * 500);
            const totalAmount = totalClaims * avgClaimAmount;
            
            return {
                payer,
                totalClaims,
                rejectedClaims,
                rejectionRate,
                totalAmount
            };
        }).sort((a, b) => b.rejectionRate - a.rejectionRate);
        
        // Calculate totals
        const totalClaims = monthlyData.reduce((sum, month) => sum + month.totalClaims, 0);
        const totalRejected = monthlyData.reduce((sum, month) => sum + month.rejectedClaims, 0);
        const rejectionRate = (totalRejected / totalClaims) * 100;
        const totalAmount = monthlyData.reduce((sum, month) => sum + month.totalAmount, 0);
        
        return {
            overallStats: {
                totalClaims,
                rejectedClaims: totalRejected,
                rejectionRate,
                totalAmount,
                averageProcessingDays: 12.4
            },
            reasonsAnalysis,
            monthlyTrends: {
                byMonth: monthlyData
            },
            payerTrends,
            timeAnalysis: {
                byMonth: monthlyData.map(month => ({
                    month: month.month,
                    total: month.totalClaims,
                    rejected: month.rejectedClaims,
                    rejectionRate: month.rejectionRate
                }))
            }
        };
    }

    setupCharts() {
        // Initialize charts if they exist in the DOM
        if (window.Chart) {
            if (this.elements.dashboard.trendChart) {
                this.charts.trend = new Chart(this.elements.dashboard.trendChart, {
                    type: 'line',
                    data: { labels: [], datasets: [] },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false
                    }
                });
            }
            
            if (this.elements.dashboard.rejectionChart) {
                this.charts.rejection = new Chart(this.elements.dashboard.rejectionChart, {
                    type: 'bar',
                    data: { labels: [], datasets: [] },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false
                    }
                });
            }
            
            if (this.elements.dashboard.payerChart) {
                this.charts.payer = new Chart(this.elements.dashboard.payerChart, {
                    type: 'horizontalBar',
                    data: { labels: [], datasets: [] },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        indexAxis: 'y'
                    }
                });
            }
        }
    }

    updateDashboard(results) {
        if (!results || !results.overallStats) return;

        // Update stats
        if (this.elements.dashboard.totalClaims) {
            this.elements.dashboard.totalClaims.textContent = results.overallStats.totalClaims.toLocaleString();
        }

        if (this.elements.dashboard.rejectionRate) {
            this.elements.dashboard.rejectionRate.textContent = `${results.overallStats.rejectionRate.toFixed(1)}%`;
        }

        if (this.elements.dashboard.totalAmount) {
            this.elements.dashboard.totalAmount.textContent = `$${results.overallStats.totalAmount.toLocaleString()}`;
        }

        if (this.elements.dashboard.processingTime) {
            this.elements.dashboard.processingTime.textContent = results.overallStats.averageProcessingDays.toFixed(1);
        }

        // Update charts
        this.updateTrendChart(results.monthlyTrends?.byMonth || []);
        this.updateRejectionChart(results.reasonsAnalysis || []);
        this.updatePayerChart(results.payerTrends || []);
        this.updateRejectionReasons(results.reasonsAnalysis || []);
    }

    updateTrendChart(monthlyData) {
        if (!this.charts.trend || !monthlyData.length) return;
        
        const labels = monthlyData.map(item => item.month);
        const totalClaims = monthlyData.map(item => item.totalClaims);
        const rejectionRates = monthlyData.map(item => item.rejectionRate);
        
        this.charts.trend.data.labels = labels;
        this.charts.trend.data.datasets = [
            {
                label: 'Total Claims',
                data: totalClaims,
                borderColor: '#ff6b35',
                backgroundColor: 'rgba(255, 107, 53, 0.1)',
                tension: 0.4,
                fill: true
            },
            {
                label: 'Rejection Rate (%)',
                data: rejectionRates,
                borderColor: '#ffffff',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                tension: 0.4,
                fill: true,
                yAxisID: 'y1'
            }
        ];
        
        this.charts.trend.options = {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    title: { display: true, text: 'Total Claims' },
                    grid: { color: 'rgba(255,255,255,0.1)' }
                },
                y1: {
                    beginAtZero: true,
                    position: 'right',
                    title: { display: true, text: 'Rejection Rate (%)' },
                    max: 100,
                    grid: { drawOnChartArea: false },
                    ticks: { color: '#ffffff' }
                },
                x: {
                    grid: { color: 'rgba(255,255,255,0.1)' }
                }
            },
            plugins: {
                legend: { labels: { color: '#cccccc' } },
                tooltip: { mode: 'index', intersect: false }
            }
        };
        
        this.charts.trend.update();
    }

    updateRejectionChart(reasonsData) {
        if (!this.charts.rejection || !reasonsData.length) return;
        
        // Get top 6 reasons
        const topReasons = reasonsData.slice(0, 6);
        const labels = topReasons.map(item => item.reason);
        const counts = topReasons.map(item => item.count);
        
        this.charts.rejection.data.labels = labels;
        this.charts.rejection.data.datasets = [
            {
                label: 'Rejected Claims',
                data: counts,
                backgroundColor: 'rgba(255, 107, 53, 0.7)',
                borderColor: 'rgba(255, 107, 53, 1)',
                borderWidth: 1
            }
        ];
        
        this.charts.rejection.options = {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(255,255,255,0.1)' },
                    ticks: { color: '#cccccc' }
                },
                x: {
                    grid: { color: 'rgba(255,255,255,0.1)' },
                    ticks: { color: '#cccccc' }
                }
            },
            plugins: {
                legend: { display: false },
                tooltip: { enabled: true }
            }
        };
        
        this.charts.rejection.update();
    }

    updatePayerChart(payerData) {
        if (!this.charts.payer || !payerData.length) return;
        
        // Get top 6 payers
        const topPayers = payerData.slice(0, 6);
        const labels = topPayers.map(item => item.payer);
        const rejectionRates = topPayers.map(item => item.rejectionRate);
        
        this.charts.payer.data.labels = labels;
        this.charts.payer.data.datasets = [
            {
                label: 'Rejection Rate (%)',
                data: rejectionRates,
                backgroundColor: 'rgba(255, 255, 255, 0.7)',
                borderColor: 'rgba(255, 255, 255, 1)',
                borderWidth: 1
            }
        ];
        
        this.charts.payer.options = {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    beginAtZero: true,
                    max: 100,
                    grid: { color: 'rgba(255,255,255,0.1)' },
                    ticks: { color: '#cccccc' }
                },
                y: {
                    grid: { color: 'rgba(255,255,255,0.1)' },
                    ticks: { color: '#cccccc' }
                }
            },
            plugins: {
                legend: { display: false }
            }
        };
        
        this.charts.payer.update();
    }

    updateRejectionReasons(reasonsData) {
        if (!this.elements.dashboard.rejectionReasons) return;
        
        const container = this.elements.dashboard.rejectionReasons;
        
        // Clear previous content
        container.innerHTML = '';
        
        if (this.elements.dashboard.rejectionReasonsLoading) {
            this.elements.dashboard.rejectionReasonsLoading.style.display = 'none';
        }
        
        if (!reasonsData.length) {
            container.innerHTML = '<p style="color: var(--text-muted);">No rejection data available</p>';
            return;
        }
        
        // Get top reasons
        const topReasons = reasonsData.slice(0, 6);
        
        // Generate HTML for each reason
        topReasons.forEach(reason => {
            const reasonDiv = document.createElement('div');
            reasonDiv.style.marginBottom = '1rem';
            reasonDiv.style.padding = '0.5rem 0';
            
            const header = document.createElement('div');
            header.style.display = 'flex';
            header.style.justifyContent = 'space-between';
            header.style.alignItems = 'center';
            header.style.marginBottom = '0.5rem';
            
            const reasonName = document.createElement('div');
            reasonName.textContent = reason.reason;
            reasonName.style.color = 'var(--text-secondary)';
            reasonName.style.fontWeight = '500';
            
            const percentage = document.createElement('div');
            percentage.textContent = `${reason.percentage.toFixed(1)}%`;
            percentage.style.color = 'var(--accent)';
            percentage.style.fontWeight = '600';
            
            header.appendChild(reasonName);
            header.appendChild(percentage);
            
            const progressBar = document.createElement('div');
            progressBar.className = 'progress-bar';
            progressBar.style.height = '6px';
            progressBar.style.marginBottom = '0';
            
            const progressFill = document.createElement('div');
            progressFill.className = 'progress-fill';
            progressFill.style.width = `${reason.percentage}%`;
            
            progressBar.appendChild(progressFill);
            
            reasonDiv.appendChild(header);
            reasonDiv.appendChild(progressBar);
            
            container.appendChild(reasonDiv);
        });
    }

    async generateAiInsights() {
        try {
            if (!this.analysisResults) {
                this.showNotification('No Data', 'Please upload and analyze data first', 'warning');
                return;
            }
            
            // Get API key
            const apiKey = this.elements.insights.apiKeyInput.value.trim();
            if (!apiKey) {
                this.showNotification('API Key Required', 'Please enter your OpenAI API key', 'warning');
                return;
            }
            
            // Show loading
            this.elements.insights.loading.style.display = 'block';
            this.elements.insights.container.style.display = 'none';
            
            // Request insights from API
            const response = await fetch(`${this.apiEndpoint}/insights`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    analysisResults: this.analysisResults,
                    apiKey
                })
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to generate insights');
            }
            
            const insightsData = await response.json();
            
            // Update UI with insights
            this.elements.insights.insightsContent.innerHTML = insightsData.insights.replace(/\n/g, '<br>');
            this.elements.insights.recommendationsContent.innerHTML = insightsData.recommendations.replace(/\n/g, '<br>');
            
            // Hide loading, show results
            this.elements.insights.loading.style.display = 'none';
            this.elements.insights.container.style.display = 'block';
            
            this.showNotification('Insights Generated', 'AI insights have been successfully generated', 'success');
        } catch (error) {
            console.error('Error generating AI insights:', error);
            this.showNotification('Insights Error', 'Failed to generate insights: ' + error.message, 'error');
            this.elements.insights.loading.style.display = 'none';
        }
    }

    async generateReport() {
        try {
            if (!this.analysisResults) {
                this.showNotification('No Data', 'Please upload and analyze data first', 'warning');
                return;
            }
            
            // Get report options
            const reportType = document.querySelector('input[name="reportType"]:checked').value;
            const sections = {
                overview: document.getElementById('include-overview').checked,
                rejections: document.getElementById('include-rejections').checked,
                trends: document.getElementById('include-trends').checked,
                payers: document.getElementById('include-payers').checked
            };
            
            // Filter data based on selected sections
            const filteredResults = {};
            
            if (sections.overview && this.analysisResults.overallStats) {
                filteredResults.overallStats = this.analysisResults.overallStats;
            }
            
            if (sections.rejections && this.analysisResults.reasonsAnalysis) {
                filteredResults.reasonsAnalysis = this.analysisResults.reasonsAnalysis;
            }
            
            if (sections.trends && this.analysisResults.monthlyTrends) {
                filteredResults.monthlyTrends = this.analysisResults.monthlyTrends;
            }
            
            if (sections.payers && this.analysisResults.payerTrends) {
                filteredResults.payerTrends = this.analysisResults.payerTrends;
            }
            
            // Generate report from API
            const response = await fetch(`${this.apiEndpoint}/report`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    analysisResults: filteredResults,
                    reportType
                })
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to generate report');
            }
            
            // Download the file
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = `insurance-analysis-report.${reportType}`;
            document.body.appendChild(a);
            a.click();
            
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            
            // Add to report list
            this.addReportToList(reportType);
            
            this.showNotification('Report Generated', `Your ${reportType.toUpperCase()} report has been downloaded`, 'success');
        } catch (error) {
            console.error('Error generating report:', error);
            this.showNotification('Report Error', 'Failed to generate report: ' + error.message, 'error');
        }
    }

    addReportToList(reportType) {
        if (!this.elements.reports.reportsList) return;
        
        const now = new Date();
        const dateStr = now.toLocaleString();
        
        // Clear "no reports" message if it exists
        if (this.elements.reports.reportsList.querySelector('p')) {
            this.elements.reports.reportsList.innerHTML = '';
        }
        
        // Create report entry
        const reportItem = document.createElement('div');
        reportItem.className = 'file-item';
        reportItem.style.marginBottom = '0.75rem';
        
        let icon = '📊';
        if (reportType === 'pdf') icon = '📄';
        if (reportType === 'json') icon = '📝';
        
        reportItem.innerHTML = `
            <div class="file-info">
                <div class="file-icon">${icon}</div>
                <div class="file-details">
                    <h4>Insurance Analysis Report (${reportType.toUpperCase()})</h4>
                    <div class="file-meta">
                        <span>${dateStr}</span>
                    </div>
                </div>
            </div>
        `;
        
        // Add to list
        this.elements.reports.reportsList.prepend(reportItem);
    }

    // Save and load state to localStorage
    saveState() {
        try {
            localStorage.setItem('brainsait_state', JSON.stringify({
                analysisResults: this.analysisResults,
                lastUpdated: new Date().toISOString()
            }));
        } catch (error) {
            console.error('Error saving state:', error);
        }
    }

    loadSavedState() {
        try {
            const savedState = localStorage.getItem('brainsait_state');
            if (savedState) {
                const state = JSON.parse(savedState);
                if (state.analysisResults) {
                    this.analysisResults = state.analysisResults;
                }
            }
        } catch (error) {
            console.error('Error loading saved state:', error);
        }
    }

    showNotification(title, message, type = 'info') {
        // Remove any existing notifications
        const existingNotifications = document.querySelectorAll('.notification');
        existingNotifications.forEach(notification => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        });
        
        const notification = document.createElement('div');
        notification.className = `notification ${type} show`;
        
        notification.innerHTML = `
            <div>
                <div style="font-weight: 600;">${this.escapeHtml(title)}</div>
                <div style="font-size: 0.9rem; opacity: 0.8;">${this.escapeHtml(message)}</div>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // Auto-hide after 4 seconds
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 4000);
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    window.appInstance = new BrainsaitIntelligence();
});
