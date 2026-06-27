let simIntervals = [];
        let isSimulating = false;
        let activeScenario = 'bhyt';
        
        // Cache DOM elements
        const btnSpeak = document.getElementById('btn-speak');
        const waveform = document.getElementById('waveform');
        const statusText = document.getElementById('sim-status-text');
        const dotStatus = document.getElementById('sim-dot-status');
        const chatArea = document.getElementById('sim-chat-area');
        const simModal = document.getElementById('sim-modal');
        const modalDesc = document.getElementById('modal-desc-text');
        
        // Setup initial state
        resetStepper();

        function clearAllTimeouts() {
            simIntervals.forEach(id => clearTimeout(id));
            simIntervals = [];
        }

        function toggleSpeech() {
            if (isSimulating) {
                stopSim();
            } else {
                startSim(activeScenario);
            }
        }

        function startScenario(scenario) {
            activeScenario = scenario;
            stopSim();
            startSim(scenario);
        }

        function resetStepper() {
            document.querySelectorAll('.step-item').forEach(item => {
                item.className = 'step-item';
            });
        }

        function setStepActive(stepId) {
            resetStepper();
            const activeStep = document.getElementById(stepId);
            if (activeStep) {
                activeStep.classList.add('active');
            }
            // Mark previous steps as done
            if (stepId === 'step-pii') {
                document.getElementById('step-match').className = 'step-item done';
            } else if (stepId === 'step-fill') {
                document.getElementById('step-match').className = 'step-item done';
                document.getElementById('step-pii').className = 'step-item done';
            }
        }

        function setAllStepsDone() {
            document.querySelectorAll('.step-item').forEach(item => {
                item.className = 'step-item done';
            });
        }

        function setStatus(text, type = 'idle') {
            statusText.textContent = text;
            if (type === 'idle') {
                dotStatus.style.backgroundColor = '#10b981'; // Green
            } else if (type === 'recording') {
                dotStatus.style.backgroundColor = '#ef4444'; // Red
            } else if (type === 'processing') {
                dotStatus.style.backgroundColor = '#f59e0b'; // Orange
            }
        }

        function startSim(scenario = 'bhyt') {
            if (isSimulating) return;
            isSimulating = true;
            resetStepper();
            clearAllTimeouts();
            
            btnSpeak.classList.add('active');
            waveform.classList.add('active');
            setStatus('Đang ghi âm giọng nói...', 'recording');
            chatArea.innerHTML = ''; // Clear chat area
            
            if (scenario === 'bhyt') {
                runBHYTSteps();
            } else {
                runThuongTruSteps();
            }
        }

        function stopSim() {
            isSimulating = false;
            clearAllTimeouts();
            
            btnSpeak.classList.remove('active');
            waveform.classList.remove('active');
            setStatus('Sẵn sàng hỗ trợ bác', 'idle');
            simModal.classList.remove('show');
            resetStepper();
        }

        function addChatBubble(text, sender, isSecure = false) {
            const bubble = document.createElement('div');
            bubble.classList.add('bubble');
            if (sender === 'user') {
                bubble.classList.add('bubble-user');
                bubble.innerHTML = `<strong>Bác:</strong> "${text}"`;
            } else {
                bubble.classList.add(isSecure ? 'bubble-secure' : 'bubble-ai');
                bubble.innerHTML = `<strong>EasyDVC:</strong> "${text}"`;
            }
            chatArea.appendChild(bubble);
            chatArea.scrollTop = chatArea.scrollHeight;
        }

        // BHYT Reissue Scenario
        function runBHYTSteps() {
            // Step 1: User speaks intent
            simIntervals.push(setTimeout(() => {
                setStepActive('step-match');
                addChatBubble('Tôi muốn đăng ký làm lại cái thẻ bảo hiểm y tế bị mất', 'user');
                setStatus('Codex DOM Annotator: Khớp biểu mẫu...', 'processing');
                waveform.classList.remove('active');
                
                // Step 2: AI answers
                simIntervals.push(setTimeout(() => {
                    addChatBubble('Dạ được chứ bác. Cháu đã gán nhãn và nhận dạng được biểu mẫu "Cấp lại thẻ BHYT". Bác vui lòng đọc số định danh (CCCD) và số điện thoại nhé.', 'ai');
                    setStatus('Đang ghi âm câu trả lời...', 'recording');
                    waveform.classList.add('active');
                    
                    // Step 3: User speaks sensitive PII data
                    simIntervals.push(setTimeout(() => {
                        setStepActive('step-pii');
                        addChatBubble('Số căn cước tôi là 037199001234, còn số điện thoại là 0912345678', 'user');
                        setStatus('PII Shield: Đang mã hóa cục bộ...', 'processing');
                        waveform.classList.remove('active');
                        
                        // Step 4: AI response with tokens & modal confirmation
                        simIntervals.push(setTimeout(() => {
                            addChatBubble('Đã phát hiện dữ liệu nhạy cảm. Lá chắn PII Shield đã che giấu thành công số định danh của bác thành: [🔒 CCCD_1] và số điện thoại thành [🔒 PHONE_1]. Bác có đồng ý điền dữ liệu thật vào tờ khai không?', 'ai', true);
                            
                            // Show modal
                            modalDesc.innerHTML = `Bác có đồng ý khôi phục và điền thông tin thật <strong>037199001234</strong> (CCCD) và <strong>0912345678</strong> (SĐT) vào các ô biểu mẫu gốc không?`;
                            simModal.classList.add('show');
                            setStatus('Đang đợi phê duyệt PII...', 'idle');
                        }, 2000));

                    }, 5000));

                }, 3000));

            }, 2000));
        }

        function confirmPII() {
            simModal.classList.remove('show');
            addChatBubble('Bác đồng ý. Điền thông tin giúp bác nhé.', 'user');
            setStatus('Codex: Đang giải mã RAM & điền biểu mẫu...', 'processing');
            setStepActive('step-fill');
            
            simIntervals.push(setTimeout(() => {
                setAllStepsDone();
                
                // Success Bubble & peak-end delighter card
                addChatBubble('Đã khôi phục dữ liệu cục bộ trong bộ nhớ RAM trình duyệt. Hoàn thành điền thông tin CCCD và Số điện thoại thật vào tờ khai dịch vụ công thành công!', 'ai', true);
                
                const successCard = document.createElement('div');
                successCard.className = 'sim-success-card';
                successCard.innerHTML = `
                    <div style="font-weight: bold; font-size: 16px; margin-bottom: 4px;">🎉 Thành công rực rỡ!</div>
                    <div style="font-size: 13px;">Tờ khai đã điền xong 100%. EasyDVC đã bảo vệ thông tin bác an toàn.</div>
                `;
                chatArea.appendChild(successCard);
                chatArea.scrollTop = chatArea.scrollHeight;
                
                stopSim();
                // Keep history and success state visible
                setStatus('Giao dịch hoàn tất an toàn!', 'idle');
            }, 2000));
        }

        function cancelPII() {
            simModal.classList.remove('show');
            addChatBubble('Không điền số thật nhé cháu.', 'user');
            setStatus('Đang hủy bỏ thao tác...', 'processing');
            
            simIntervals.push(setTimeout(() => {
                addChatBubble('Dạ cháu hiểu. Đã hủy bỏ thao tác khôi phục. Các thông tin nhạy cảm của bác không được điền vào biểu mẫu.', 'ai');
                stopSim();
            }, 1500));
        }

        // Residency Register Scenario (Cascading address highlight)
        function runThuongTruSteps() {
            simIntervals.push(setTimeout(() => {
                setStepActive('step-match');
                addChatBubble('Tôi muốn chuyển hộ khẩu nhập học cho cháu lên thành phố', 'user');
                setStatus('Codex CLI: Biên dịch ý định hành chính...', 'processing');
                waveform.classList.remove('active');
                
                simIntervals.push(setTimeout(() => {
                    addChatBubble('Dạ, cháu hiểu ý bác là muốn đăng ký thường trú. Cháu đã mở mẫu đăng ký thường trú. Bác vui lòng đọc địa chỉ nơi chuyển đến (Tỉnh, Huyện, Xã) nhé.', 'ai');
                    setStatus('Đang ghi âm câu trả lời...', 'recording');
                    waveform.classList.add('active');
                    
                    simIntervals.push(setTimeout(() => {
                        setStepActive('step-fill');
                        addChatBubble('Địa chỉ ở Thành phố Hà Nội, Quận Cầu Giấy, Phường Dịch Vọng', 'user');
                        setStatus('Đang Polling đợi AJAX tải dropdown Tỉnh...', 'processing');
                        waveform.classList.remove('active');
                        
                        // Wait cascade dropdown polling simulations
                        simIntervals.push(setTimeout(() => {
                            setStatus('Đang Polling đợi AJAX tải dropdown Huyện...', 'processing');
                            addChatBubble('Lớp DOM: [✓] Đã chọn Thành phố Hà Nội ➔ Đang thăm dò Quận Cầu Giấy...', 'ai', true);
                            
                            simIntervals.push(setTimeout(() => {
                                setStatus('Đang Polling đợi AJAX tải dropdown Xã...', 'processing');
                                addChatBubble('Lớp DOM: [✓] Đã chọn Quận Cầu Giấy ➔ Đang thăm dò Phường Dịch Vọng...', 'ai', true);
                                
                                simIntervals.push(setTimeout(() => {
                                    setAllStepsDone();
                                    addChatBubble('Đã điền tự động thành công địa chỉ 3 cấp hoàn chỉnh vượt độ trễ AJAX!', 'ai');
                                    
                                    const successCard = document.createElement('div');
                                    successCard.className = 'sim-success-card';
                                    successCard.innerHTML = `
                                        <div style="font-weight: bold; font-size: 16px; margin-bottom: 4px;">🎉 Địa chính đã điền xong!</div>
                                        <div style="font-size: 13px;">Hệ thống đã polling qua 3 cấp AJAX trơn tru.</div>
                                    `;
                                    chatArea.appendChild(successCard);
                                    chatArea.scrollTop = chatArea.scrollHeight;
                                    
                                    stopSim();
                                    setStatus('Giao dịch hoàn tất an toàn!', 'idle');
                                }, 2500));
                                
                            }, 2000));
                            
                        }, 2000));

                    }, 5000));
                    
                }, 3000));
                
            }, 2000));
        }

        // Live PII Shield Tester (IKEA Effect)
        function testLivePII() {
            const inputField = document.getElementById('ikea-input-field');
            const resultBox = document.getElementById('ikea-result-box');
            const val = inputField.value.trim();
            
            if (!val) {
                resultBox.style.display = 'block';
                resultBox.style.borderLeftColor = 'var(--color-record)';
                resultBox.innerHTML = '<span style="color:var(--color-record)">Vui lòng nhập số CCCD hoặc SĐT để thử nghiệm.</span>';
                return;
            }

            // Simple regex for CCCD (12 digits) or Phone (10 digits)
            const cccdRegex = /\b\d{12}\b/g;
            const phoneRegex = /\b(0\d{9})\b/g;
            
            let maskedVal = val;
            let piiDetected = false;
            let logMsg = '';

            if (cccdRegex.test(val)) {
                maskedVal = val.replace(cccdRegex, '[🔒 CCCD_MASKED]');
                piiDetected = true;
                logMsg = `<strong>Phát hiện CCCD nhạy cảm!</strong><br>Văn bản gốc: <del style="color:var(--color-record)">${val}</del><br>Sau khi lọc: <strong style="color:var(--color-success)">${maskedVal}</strong> (Đã che giấu tại RAM máy khách)`;
            } else if (phoneRegex.test(val)) {
                maskedVal = val.replace(phoneRegex, '[🔒 PHONE_MASKED]');
                piiDetected = true;
                logMsg = `<strong>Phát hiện SĐT nhạy cảm!</strong><br>Văn bản gốc: <del style="color:var(--color-record)">${val}</del><br>Sau khi lọc: <strong style="color:var(--color-success)">${maskedVal}</strong> (Đã che giấu tại RAM máy khách)`;
            } else {
                logMsg = `<strong>Không phát hiện PII nhạy cảm:</strong> "${val}" (Có thể an toàn gửi đi)`;
            }

            resultBox.style.display = 'block';
            resultBox.style.borderLeftColor = piiDetected ? 'var(--color-success)' : 'var(--color-primary)';
            resultBox.innerHTML = logMsg;
        }

        // Zalo OTP Simulator
        function triggerOTPSim() {
            const notif = document.getElementById('otp-notification');
            notif.classList.add('show');
            
            // Hide notification after 5 seconds
            setTimeout(() => {
                notif.classList.remove('show');
            }, 5000);
        }

        // FAQ Toggle Accordion
        function toggleFaq(btn) {
            const item = btn.parentElement;
            const content = item.querySelector('.faq-content');
            
            // Check if active
            const isActive = item.classList.contains('active');
            
            // Close all
            document.querySelectorAll('.faq-item').forEach(i => {
                i.classList.remove('active');
                i.querySelector('.faq-content').style.maxHeight = null;
            });
            
            if (!isActive) {
                item.classList.add('active');
                content.style.maxHeight = content.scrollHeight + "px";
            }
        }

        // Expose functions globally for inline HTML onclick handlers in Vite
        window.toggleSpeech = toggleSpeech;
        window.startSim = startSim;
        window.stopSim = stopSim;
        window.startScenario = startScenario;
        window.confirmPII = confirmPII;
        window.cancelPII = cancelPII;
        window.testLivePII = testLivePII;
        window.triggerOTPSim = triggerOTPSim;
        window.toggleFaq = toggleFaq;