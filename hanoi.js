class HanoiTower {
    constructor() {
        this.TOTAL_DISKS = 3;
        this.MOVE_DELAY = 2000;
        this.towers = [[], [], []];
        this.moveCount = 0;
        this.isPlaying = false;
        this.isPaused = false;
        this.minMoves = Math.pow(2, this.TOTAL_DISKS) - 1;
        this.selectedDisk = null;
        this.dragSource = null;
        this.isShowingSolution = false;
        this.startTime = null;
        this.timerInterval = null;
        this.isGameStarted = false;
        this.towerButtons = document.querySelectorAll('.tower-button');

        // DOM要素の取得
        this.initializeDOMElements();

        // 音声の初期化
        this.initializeAudio();

        // イベントリスナーの設定
        this.setupEventListeners();

        // タワーのドラッグ＆ドロップイベントの設定
        this.setupDragAndDrop();

        // 初期化
        this.initializeTowers();
        this.updateMoveCount();
    }

    initializeDOMElements() {
        this.moveCountElement = document.getElementById('moveCount');
        this.minMovesElement = document.getElementById('minMoves');
        this.startGameButton = document.getElementById('startGameButton');
        this.resetButton = document.getElementById('resetButton');
        this.showSolutionButton = document.getElementById('showSolutionButton');
        this.diskCountSelect = document.getElementById('diskCount');
        this.congratsElement = document.getElementById('congratulations');
        this.closeCongratsButton = document.getElementById('closeCongratsButton');
        this.finalMoveCountElement = document.getElementById('finalMoveCount');
        this.finalMinMovesElement = document.getElementById('finalMinMoves');
        this.finalTimeElement = document.getElementById('finalTime');
        this.finalScoreElement = document.getElementById('finalScore');
        this.timerElement = document.getElementById('timer');
        this.volumeSlider = document.getElementById('volumeSlider');
        this.towerElements = [
            document.getElementById('tower0'),
            document.getElementById('tower1'),
            document.getElementById('tower2')
        ];
    }

    initializeAudio() {
        this.bgm = new Audio('bgm.mp3');
        this.bgm.loop = true;
        this.moveSound = new Audio('move.mp3');
        this.successSound = new Audio('success.mp3');
        this.buttonSound = new Audio('button.mp3');

        // 音声ファイルのエラーハンドリング
        this.moveSound.onerror = () => console.warn('Warning: move.mp3 could not be loaded');
        this.bgm.onerror = () => console.warn('Warning: bgm.mp3 could not be loaded');
        this.successSound.onerror = () => console.warn('Warning: success.mp3 could not be loaded');
        this.buttonSound.onerror = () => console.warn('Warning: button.mp3 could not be loaded');
    }

    setupEventListeners() {
        if (this.startGameButton) {
            this.startGameButton.addEventListener('click', () => this.startGame());
        }
        if (this.resetButton) {
            this.resetButton.addEventListener('click', () => this.resetGame());
        }
        if (this.showSolutionButton) {
            this.showSolutionButton.addEventListener('click', () => this.showSolution());
        }
        if (this.diskCountSelect) {
            this.diskCountSelect.addEventListener('change', () => this.handleDiskCountChange());
        }
        if (this.closeCongratsButton) {
            this.closeCongratsButton.addEventListener('click', () => this.hideCongratsMessage());
        }
        if (this.volumeSlider) {
            this.volumeSlider.addEventListener('input', (e) => this.setVolume(e.target.value));
        }

        // 塔の選択ボタンのイベントリスナーを設定
        this.towerButtons.forEach(button => {
            button.addEventListener('click', () => {
                const towerIndex = parseInt(button.getAttribute('data-tower'));
                this.handleTowerButtonClick(towerIndex, button);
            });
        });
    }

    setupDragAndDrop() {
        this.towerElements.forEach((tower, towerIndex) => {
            // タワーのクリックイベント
            tower.addEventListener('click', () => this.handleTowerClick(towerIndex));

            // ドラッグ＆ドロップイベント
            tower.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
            });

            tower.addEventListener('drop', (e) => {
                e.preventDefault();
                if (this.dragSource !== null) {
                    this.handleDiskMove(this.dragSource, towerIndex);
                    this.dragSource = null;
                }
            });
        });
    }

    playButtonSound() {
        if (this.buttonSound && this.buttonSound.readyState >= 2) {
            this.buttonSound.currentTime = 0;
            this.buttonSound.play().catch(err => console.warn('Button sound playback failed:', err));
        }
    }

    startGame() {
        try {
            this.playButtonSound();
        } catch (err) {
            console.warn('Button sound playback failed:', err);
        }

        this.isGameStarted = true;
        this.startGameButton.disabled = true;
        this.resetButton.disabled = false;
        this.showSolutionButton.disabled = false;
        this.diskCountSelect.disabled = true;

        // 塔の選択ボタンを有効化
        this.towerButtons.forEach(button => {
            button.disabled = false;
        });

        // BGM再生
        if (this.bgm) {
            this.bgm.currentTime = 0;
            this.bgm.play().catch(err => console.warn('BGM playback failed:', err));
        }

        // タイマー開始
        this.startTimer();
    }

    resetGame() {
        if (this.isShowingSolution) {
            this.isShowingSolution = false;
            this.showSolutionButton.textContent = '回答を見る';
            this.showSolutionButton.disabled = true;
        }

        // ゲーム状態のリセット
        this.isGameStarted = false;
        this.startGameButton.disabled = false;
        this.resetButton.disabled = true;
        this.showSolutionButton.disabled = true;
        this.diskCountSelect.disabled = false;

        // 塔の選択ボタンを無効化とリセット
        this.towerButtons.forEach(button => {
            button.disabled = true;
            button.classList.remove('selected');
        });

        // BGMの停止
        if (this.bgm) {
            this.bgm.pause();
            this.bgm.currentTime = 0;
        }

        this.initializeTowers();
        this.moveCount = 0;
        this.minMoves = Math.pow(2, this.TOTAL_DISKS) - 1;
        this.updateMoveCount();
        this.selectedDisk = null;
        this.dragSource = null;
        this.stopTimer();
        this.timerElement.textContent = '00:00';
        this.startTime = null;
    }

    handleDiskCountChange() {
        this.TOTAL_DISKS = parseInt(this.diskCountSelect.value);
        this.resetGame();
    }

    handleTowerButtonClick(towerIndex, button) {
        if (!this.isGameStarted || this.isShowingSolution) return;

        console.log('Button clicked - Tower Index:', towerIndex);
        console.log('Current tower state:', this.towers[towerIndex]);

        if (this.selectedDisk === null) {
            // 塔を選択
            if (this.towers[towerIndex].length > 0) {
                this.selectedDisk = towerIndex;
                button.classList.add('selected');
                this.highlightTopDisk(towerIndex);
                console.log('Selected disk from tower:', towerIndex);
            }
        } else {
            // 移動を試みる
            console.log('Moving disk from tower', this.selectedDisk, 'to tower', towerIndex);
            this.handleDiskMove(this.selectedDisk, towerIndex);
            // 選択状態をリセット
            this.selectedDisk = null;
            this.towerButtons.forEach(btn => btn.classList.remove('selected'));
            this.removeAllHighlights();
        }
    }

    handleTowerClick(towerIndex) {
        if (!this.isGameStarted || this.isShowingSolution) return;

        if (this.selectedDisk === null) {
            if (this.towers[towerIndex].length > 0) {
                this.selectedDisk = towerIndex;
                this.towerButtons[towerIndex].classList.add('selected');
                this.highlightTopDisk(towerIndex);
            }
        } else {
            this.handleDiskMove(this.selectedDisk, towerIndex);
            this.selectedDisk = null;
            this.towerButtons.forEach(btn => btn.classList.remove('selected'));
            this.removeAllHighlights();
        }
    }

    highlightTopDisk(towerIndex) {
        console.log('Highlighting top disk of tower:', towerIndex);
        console.log('Tower contents:', this.towers[towerIndex]);

        this.removeAllHighlights();
        const tower = this.towerElements[towerIndex];
        // 一番上のプレート（最後の子要素）を取得
        const topDisk = tower.lastChild;

        console.log('Top disk element:', topDisk);

        if (topDisk) {
            // 一番上のプレートだけを選択状態にする
            topDisk.classList.add('selected');
            // プレートが選択可能であることを示すカーソルスタイルを追加
            topDisk.style.cursor = 'pointer';
            console.log('Added selected class to disk:', topDisk.getAttribute('data-size'));
        }
    }

    removeAllHighlights() {
        // すべてのプレートの選択状態を解除
        document.querySelectorAll('.disk.selected').forEach(disk => {
            disk.classList.remove('selected');
            disk.style.cursor = '';
        });
    }

    handleDiskMove(fromTower, toTower) {
        if (!this.isGameStarted || this.isShowingSolution) return;
        if (fromTower === toTower) return;

        const fromStack = this.towers[fromTower];
        const toStack = this.towers[toTower];

        if (fromStack.length === 0) return;

        const diskToMove = fromStack[fromStack.length - 1];
        const topDiskAtDestination = toStack.length > 0 ? toStack[toStack.length - 1] : Infinity;

        if (diskToMove < topDiskAtDestination) {
            this.moveDisk(fromTower, toTower);
            this.checkWinCondition();
        }
    }

    moveDisk(from, to) {
        const disk = this.towers[from].pop();
        this.towers[to].push(disk);
        this.moveCount++;
        this.updateMoveCount();
        this.playMoveSound();
        this.renderTowers();
    }

    async checkWinCondition() {
        const targetTower = this.towers[2];

        // 目標の塔にすべてのディスクがあるかだけをチェック
        if (targetTower.length === this.TOTAL_DISKS) {
            // ゲームクリア時の処理
            this.stopTimer();
            const elapsedTime = Date.now() - this.startTime;
            const elapsedSeconds = Math.floor(elapsedTime / 1000);

            // BGMの停止
            if (this.bgm) {
                this.bgm.pause();
                this.bgm.currentTime = 0;
            }

            // クリアアニメーション
            const disks = this.towerElements[2].querySelectorAll('.disk');
            for (let i = disks.length - 1; i >= 0; i--) {
                disks[i].classList.add('success');
                await new Promise(resolve => setTimeout(resolve, 100));
            }

            // 効果音を再生
            this.playSuccessSound();

            // スコアを計算
            const score = this.calculateScore(this.moveCount, this.minMoves, elapsedSeconds);

            // クリアメッセージを表示
            this.showCongratsMessage(elapsedTime, score);
        }
    }

    showCongratsMessage(elapsedTime, score) {
        const minutes = Math.floor(elapsedTime / 60000);
        const seconds = Math.floor((elapsedTime % 60000) / 1000);
        this.finalMoveCountElement.textContent = this.moveCount;
        this.finalMinMovesElement.textContent = this.minMoves;
        this.finalTimeElement.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        this.finalScoreElement.textContent = score;
        this.congratsElement.classList.add('show');
    }

    hideCongratsMessage() {
        this.congratsElement.classList.remove('show');
    }

    startTimer() {
        if (this.timerInterval) return;
        this.startTime = Date.now();
        this.timerInterval = setInterval(() => {
            const elapsedTime = Date.now() - this.startTime;
            this.updateTimer(elapsedTime);
        }, 1000);
    }

    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }

    updateTimer(elapsedTime) {
        const minutes = Math.floor(elapsedTime / 60000);
        const seconds = Math.floor((elapsedTime % 60000) / 1000);
        this.timerElement.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }

    updateMoveCount() {
        this.moveCountElement.textContent = `${this.moveCount}`;
        this.minMovesElement.textContent = `${this.minMoves}`;
    }

    initializeTowers() {
        this.towers = [[], [], []];
        // 大きい数字のプレートが下になるように初期化
        for (let i = this.TOTAL_DISKS; i > 0; i--) {
            this.towers[0].push(i);
        }
        console.log('Initialized towers:', this.towers);
        this.renderTowers();
    }

    renderTowers() {
        this.towerElements.forEach((tower, index) => {
            tower.innerHTML = '';
            console.log(`Rendering tower ${index} with disks:`, this.towers[index]);

            // プレートを下から順に積み上げる
            this.towers[index].forEach((diskSize, diskIndex) => {
                const disk = document.createElement('div');
                disk.className = 'disk';
                if (!this.isShowingSolution && this.isGameStarted) {
                    disk.classList.add('draggable');
                    disk.draggable = true;
                }
                disk.setAttribute('data-size', diskSize);

                // 選択状態のスタイルを追加（一番上のプレートのみ）
                if (this.selectedDisk === index &&
                    diskIndex === this.towers[index].length - 1) {
                    disk.classList.add('selected');
                    console.log(`Selected disk ${diskSize} at tower ${index}`);
                }

                // 一番上のプレートの場合、移動可能であることを示すスタイルを追加
                if (diskIndex === this.towers[index].length - 1 &&
                    this.isGameStarted &&
                    !this.isShowingSolution) {
                    disk.style.cursor = 'pointer';
                }

                disk.addEventListener('dragstart', (e) => {
                    if (this.isShowingSolution || !this.isGameStarted) {
                        e.preventDefault();
                        return;
                    }
                    if (this.isValidDiskToMove(index, diskSize)) {
                        this.dragSource = index;
                        disk.classList.add('dragging');
                        console.log(`Started dragging disk ${diskSize} from tower ${index}`);
                    } else {
                        e.preventDefault();
                    }
                });

                disk.addEventListener('dragend', () => {
                    disk.classList.remove('dragging');
                });

                // ディスクの幅を計算（小さい数字ほど細くなるように）
                const maxWidth = 95; // 最大幅（%）
                const minWidth = 30; // 最小幅（%）
                // diskSizeが小さいほど幅が狭くなるように計算
                const width = minWidth + ((maxWidth - minWidth) * (diskSize - 1)) / (this.TOTAL_DISKS - 1);
                disk.style.width = `${width}%`;

                tower.appendChild(disk);
            });
        });
    }

    isValidDiskToMove(towerIndex, diskSize) {
        if (this.isShowingSolution || !this.isGameStarted) return false;
        const tower = this.towers[towerIndex];
        // 一番上のプレートかどうかを確認
        return tower.length > 0 && tower[tower.length - 1] === diskSize;
    }

    playMoveSound() {
        if (this.moveSound && this.moveSound.readyState >= 2) {
            this.moveSound.currentTime = 0;
            this.moveSound.play().catch(err => console.warn('Audio playback failed:', err));
        }
    }

    playSuccessSound() {
        if (this.successSound && this.successSound.readyState >= 2) {
            this.successSound.currentTime = 0;
            this.successSound.play().catch(err => console.warn('Audio playback failed:', err));
        }
    }

    setVolume(value) {
        const volume = parseFloat(value);
        if (this.moveSound) {
            this.moveSound.volume = volume;
        }
        if (this.successSound) {
            this.successSound.volume = volume;
        }
        if (this.bgm) {
            this.bgm.volume = volume;
        }
    }

    calculateScore(moveCount, minMoves, elapsedSeconds) {
        // 基本スコア: 1000点
        let score = 1000;

        // 移動回数による減点
        const movesPenalty = Math.max(0, moveCount - minMoves) * 10;
        score -= movesPenalty;

        // 時間による減点（1分あたり50点、最大500点）
        const timePenalty = Math.min(500, Math.floor(elapsedSeconds / 60) * 50);
        score -= timePenalty;

        // 最低スコアは100点
        return Math.max(100, score);
    }

    async showSolution() {
        if (this.isShowingSolution) return;

        this.isShowingSolution = true;
        this.showSolutionButton.textContent = '回答表示中...';
        this.showSolutionButton.disabled = true;
        this.resetGame();

        try {
            await this.solveHanoi(this.TOTAL_DISKS, 0, 1, 2);
        } catch (error) {
            console.error('Solving interrupted:', error);
        }

        this.showSolutionButton.textContent = '回答を見る';
        this.showSolutionButton.disabled = false;
        this.isShowingSolution = false;
    }

    async solveHanoi(n, source, auxiliary, target) {
        if (n === 1) {
            await this.moveDisk(source, target);
            await new Promise(resolve => setTimeout(resolve, 1000));
            return;
        }
        await this.solveHanoi(n - 1, source, target, auxiliary);
        await this.moveDisk(source, target);
        await new Promise(resolve => setTimeout(resolve, 1000));
        await this.solveHanoi(n - 1, auxiliary, source, target);
    }
}

// アプリケーションの初期化
document.addEventListener('DOMContentLoaded', () => {
    new HanoiTower();
}); 