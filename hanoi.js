// AudioManager class for handling all audio-related operations
class AudioManager {
    constructor() {
        this.bgm = new Audio('bgm.mp3');
        this.moveSound = new Audio('move.mp3');
        this.successSound = new Audio('success.mp3');

        this.bgm.loop = true;
        this.isInitialized = false;

        // Error handling for audio files
        this.setupErrorHandling();

        // Initialize volume
        this.setVolume(0.5);

        // モバイル対応のための初期化処理
        this.setupMobileAudio();
    }

    setupErrorHandling() {
        const audioFiles = {
            'move.mp3': this.moveSound,
            'bgm.mp3': this.bgm,
            'success.mp3': this.successSound
        };

        for (const [filename, audio] of Object.entries(audioFiles)) {
            audio.onerror = () => console.warn(`Warning: ${filename} could not be loaded`);
        }
    }

    setVolume(value) {
        const audioElements = [this.bgm, this.moveSound, this.successSound];
        audioElements.forEach(audio => {
            if (audio) audio.volume = value;
        });
    }

    setupMobileAudio() {
        // タッチイベントのリスナーを追加
        document.addEventListener('touchstart', () => {
            if (!this.isInitialized) {
                this.initializeAudio();
            }
        }, { once: true });

        // クリックイベントのリスナーも追加（タブレットなど）
        document.addEventListener('click', () => {
            if (!this.isInitialized) {
                this.initializeAudio();
            }
        }, { once: true });
    }

    initializeAudio() {
        // 全てのオーディオを一度再生して即座に停止
        const audioElements = [this.bgm, this.moveSound, this.successSound];

        Promise.all(audioElements.map(audio => {
            if (audio) {
                audio.volume = 0;
                return audio.play()
                    .then(() => {
                        audio.pause();
                        audio.currentTime = 0;
                        audio.volume = 0.5;
                    })
                    .catch(err => console.warn('Audio initialization failed:', err));
            }
            return Promise.resolve();
        })).then(() => {
            this.isInitialized = true;
            console.log('Audio initialized successfully');
        });
    }

    playBGM() {
        if (this.bgm && this.bgm.readyState >= 2) {
            this.bgm.currentTime = 0;
            this.bgm.play().catch(err => console.warn('BGM playback failed:', err));
        }
    }

    stopBGM() {
        if (this.bgm) {
            this.bgm.pause();
            this.bgm.currentTime = 0;
        }
    }

    playMoveSound() {
        if (this.moveSound && this.moveSound.readyState >= 2) {
            this.moveSound.currentTime = 0;
            this.moveSound.play().catch(err => console.warn('Move sound playback failed:', err));
        }
    }

    playSuccessSound() {
        if (this.successSound && this.successSound.readyState >= 2) {
            this.successSound.currentTime = 0;
            this.successSound.play().catch(err => console.warn('Success sound playback failed:', err));
        }
    }
}

// Game state management
const GameState = {
    IDLE: 'idle',
    PLAYING: 'playing',
    PAUSED: 'paused',
    SHOWING_SOLUTION: 'showing_solution',
    COMPLETED: 'completed'
};

// Screen management
const ScreenState = {
    START: 'start',
    GAME: 'game',
    SCORE: 'score'
};

// Constants
const CONSTANTS = {
    MIN_DISKS: 3,
    MAX_DISKS: 12,
    MOVE_DELAY: 2000,
    DEFAULT_VOLUME: 0.5
};

class HanoiTower {
    constructor() {
        // Initialize DOM elements first
        this.initializeDOMElements();
        this.initializeScreenElements();

        // DOM要素が見つからない場合はエラーを表示
        if (!this.validateDOMElements()) {
            console.error('Required DOM elements not found. Please check the HTML structure.');
            return;
        }

        // Initialize game state
        this.audioManager = new AudioManager();
        this.state = GameState.IDLE;
        this.currentScreen = ScreenState.START;
        this.TOTAL_DISKS = CONSTANTS.MIN_DISKS;
        this.towers = [[], [], []];
        this.moveCount = 0;
        this.minMoves = Math.pow(2, this.TOTAL_DISKS) - 1;
        this.selectedDisk = null;
        this.dragSource = null;
        this.startTime = null;
        this.timerInterval = null;
        this.towerButtons = document.querySelectorAll('.tower-button');

        // Setup and initialize game
        this.setupEventListeners();
        this.setupDragAndDrop();
        this.initializeTowers();
        this.updateMoveCount();
        this.loadHighScores();
        this.updateHighScoreDisplay();
        this.updateShowSolutionButton();
        this.updateMinMovesDisplay();

        // 必ずスタート画面から始める
        this.switchScreen(ScreenState.START);
    }

    validateDOMElements() {
        // 必要なDOM要素が存在するか確認
        const requiredElements = [
            this.towerElements && this.towerElements.every(element => element !== null),
            this.moveCountElement,
            this.minMovesElement,
            this.showSolutionButton,
            this.diskCountSelect,
            this.playButton,
            this.showScoresButton,
            this.backToStartButton,
            this.backFromScoresButton,
            this.screens.start,
            this.screens.game,
            this.screens.score
        ];

        const missingElements = [];
        if (!this.towerElements || !this.towerElements.every(element => element !== null)) {
            missingElements.push('tower elements');
        }
        if (!this.moveCountElement) missingElements.push('moveCount');
        if (!this.minMovesElement) missingElements.push('minMoves');
        if (!this.showSolutionButton) missingElements.push('showSolutionButton');
        if (!this.diskCountSelect) missingElements.push('diskCountSelect');
        if (!this.playButton) missingElements.push('playButton');
        if (!this.showScoresButton) missingElements.push('showScoresButton');
        if (!this.backToStartButton) missingElements.push('backToStartButton');
        if (!this.backFromScoresButton) missingElements.push('backFromScoresButton');
        if (!this.screens.start) missingElements.push('startScreen');
        if (!this.screens.game) missingElements.push('gameScreen');
        if (!this.screens.score) missingElements.push('scoreScreen');

        if (missingElements.length > 0) {
            console.error('Missing DOM elements:', missingElements.join(', '));
            return false;
        }

        return requiredElements.every(element => element !== null);
    }

    initializeScreenElements() {
        this.screens = {
            start: document.getElementById('startScreen'),
            game: document.getElementById('gameScreen'),
            score: document.getElementById('scoreScreen')
        };

        // Navigation buttons
        this.playButton = document.getElementById('playButton');
        this.showScoresButton = document.getElementById('showScoresButton');
        this.backToStartButton = document.getElementById('backToStartButton');
        this.backFromScoresButton = document.getElementById('backFromScoresButton');

        // Set initial screen
        this.switchScreen(ScreenState.START);
    }

    initializeDOMElements() {
        // Game elements
        this.moveCountElement = document.getElementById('moveCount');
        this.minMovesElement = document.getElementById('minMoves');
        this.showSolutionButton = document.getElementById('showSolutionButton');
        this.diskCountSelect = document.getElementById('diskCount');
        this.congratsElement = document.getElementById('congratulations');
        this.closeCongratsButton = document.getElementById('closeCongratsButton');
        this.finalMoveCountElement = document.getElementById('finalMoveCount');
        this.finalMinMovesElement = document.getElementById('finalMinMoves');
        this.finalTimeElement = document.getElementById('finalTime');
        this.finalScoreElement = document.getElementById('finalScore');
        this.timerElement = document.getElementById('timer');
        this.towerElements = [
            document.getElementById('tower0'),
            document.getElementById('tower1'),
            document.getElementById('tower2')
        ];
    }

    setupEventListeners() {
        // Screen navigation event listeners
        this.playButton.addEventListener('click', () => this.handlePlayButtonClick());
        this.showScoresButton.addEventListener('click', () => this.switchScreen(ScreenState.SCORE));
        this.backToStartButton.addEventListener('click', () => this.handleBackToStart());
        this.backFromScoresButton.addEventListener('click', () => this.handleBackFromScores());

        // Game control event listeners
        if (this.showSolutionButton) {
            this.showSolutionButton.addEventListener('click', () => this.handleShowSolution());
        }
        if (this.diskCountSelect) {
            this.diskCountSelect.addEventListener('change', () => this.handleDiskCountChange());
        }
        if (this.closeCongratsButton) {
            this.closeCongratsButton.addEventListener('click', () => this.hideCongratsMessage());
        }

        // Tower button event listeners
        this.towerButtons.forEach(button => {
            button.addEventListener('click', () => {
                const towerIndex = parseInt(button.getAttribute('data-tower'));
                this.handleTowerButtonClick(towerIndex, button);
            });
        });
    }

    setupDragAndDrop() {
        if (!this.towerElements) return;

        this.towerElements.forEach((tower, towerIndex) => {
            if (!tower) {
                console.error(`Tower element ${towerIndex} not found`);
                return;
            }

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

    handlePlayButtonClick() {
        this.switchScreen(ScreenState.GAME);
        this.startGame();
    }

    handleDiskCountChange() {
        const newDiskCount = parseInt(this.diskCountSelect.value);
        if (newDiskCount >= CONSTANTS.MIN_DISKS && newDiskCount <= CONSTANTS.MAX_DISKS) {
            this.TOTAL_DISKS = newDiskCount;
            this.minMoves = Math.pow(2, this.TOTAL_DISKS) - 1;
            this.updateMinMovesDisplay();
            this.updateShowSolutionButton();

            if (this.state === GameState.PLAYING) {
                this.resetGame();
            } else {
                this.initializeTowers();
                this.renderTowers();
            }
        }
    }

    updateShowSolutionButton() {
        if (!this.showSolutionButton) return;

        // 解答表示中のみボタンを無効化
        const isDisabled = this.state === GameState.SHOWING_SOLUTION;
        this.showSolutionButton.disabled = isDisabled;
    }

    updateMinMovesDisplay() {
        if (this.minMovesElement) {
            this.minMovesElement.textContent = this.minMoves;
        }
    }

    startGame() {
        // Reset game state
        this.state = GameState.PLAYING;
        this.moveCount = 0;
        this.selectedDisk = null;
        this.dragSource = null;

        // Initialize towers
        this.initializeTowers();
        this.renderTowers();

        // Update UI
        this.updateMoveCount();
        this.updateMinMovesDisplay();

        // Enable tower buttons
        this.towerButtons.forEach(button => {
            button.disabled = false;
        });

        // Start timer
        this.startTimer();

        // Play BGM
        this.audioManager.playBGM();

        // Update solution button state
        this.updateShowSolutionButton();
    }

    resetGame() {
        if (this.state === GameState.SHOWING_SOLUTION) {
            this.state = GameState.IDLE;
            this.showSolutionButton.textContent = '回答を見る';
        }

        this.state = GameState.IDLE;
        this.moveCount = 0;
        this.selectedDisk = null;
        this.dragSource = null;
        this.updateMoveCount();
        this.initializeTowers();
        this.renderTowers();

        // タイマー表示をリセット
        if (this.timerElement) {
            this.timerElement.textContent = '00:00';
        }
    }

    handleTowerButtonClick(towerIndex, button) {
        if (this.state !== GameState.PLAYING || this.state === GameState.SHOWING_SOLUTION) return;

        if (this.selectedDisk === null) {
            // 塔を選択
            if (this.towers[towerIndex].length > 0) {
                this.selectedDisk = towerIndex;
                button.classList.add('selected');
                this.highlightTopDisk(towerIndex);
            }
        } else {
            // 移動を試みる
            this.handleDiskMove(this.selectedDisk, towerIndex);
            // 選択状態をリセット
            this.selectedDisk = null;
            this.towerButtons.forEach(btn => btn.classList.remove('selected'));
            this.removeAllHighlights();
        }
    }

    handleTowerClick(towerIndex) {
        if (this.state !== GameState.PLAYING || this.state === GameState.SHOWING_SOLUTION) return;

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
        this.removeAllHighlights();
        const tower = this.towerElements[towerIndex];
        // 一番上のプレート（最後の子要素）を取得
        const topDisk = tower.lastChild;

        if (topDisk) {
            // 一番上のプレートだけを選択状態にする
            topDisk.classList.add('selected');
            // プレートが選択可能であることを示すカーソルスタイルを追加
            topDisk.style.cursor = 'pointer';
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
        if (this.state !== GameState.PLAYING || this.state === GameState.SHOWING_SOLUTION) return;
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
        this.audioManager.playMoveSound();
        this.renderTowers();
    }

    checkWinCondition() {
        // Check if all disks are on the target tower
        if (this.towers[2].length === this.TOTAL_DISKS) {
            this.state = GameState.COMPLETED;
            this.stopTimer();
            // Stop BGM when game is completed
            this.audioManager.stopBGM();
            this.showCongratsMessage();
            this.updateShowSolutionButton();
        }
    }

    showCongratsMessage() {
        if (!this.congratsElement) return;

        const finalTime = this.timerElement.textContent;
        const score = this.calculateScore(this.moveCount, this.minMoves, finalTime);

        if (this.finalMoveCountElement) {
            this.finalMoveCountElement.textContent = this.moveCount;
        }
        if (this.finalMinMovesElement) {
            this.finalMinMovesElement.textContent = this.minMoves;
        }
        if (this.finalTimeElement) {
            this.finalTimeElement.textContent = finalTime;
        }
        if (this.finalScoreElement) {
            this.finalScoreElement.textContent = score;
        }

        // ハイスコアを保存
        this.saveHighScore(this.TOTAL_DISKS, this.moveCount, finalTime);

        this.congratsElement.classList.add('show');
        this.audioManager.playSuccessSound();
    }

    hideCongratsMessage() {
        if (!this.congratsElement) return;
        this.congratsElement.classList.remove('show');
    }

    startTimer() {
        // 既存のタイマーがある場合は停止
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
        }

        this.startTime = Date.now();
        this.timerInterval = setInterval(() => {
            const currentTime = Date.now();
            const elapsedTime = currentTime - this.startTime;
            if (this.timerElement) {
                this.timerElement.textContent = this.formatTime(elapsedTime);
            }
        }, 1000);
    }

    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }

    formatTime(time) {
        // 文字列形式（"MM:SS"）の場合の処理
        if (typeof time === 'string') {
            return time;
        }

        // ミリ秒から分と秒を計算
        const totalSeconds = Math.floor(time / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;

        // 2桁の形式にフォーマット
        return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
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
        this.renderTowers();
    }

    renderTowers() {
        this.towerElements.forEach((tower, index) => {
            tower.innerHTML = '';

            // プレートを下から順に積み上げる
            this.towers[index].forEach((diskSize, diskIndex) => {
                const disk = document.createElement('div');
                disk.className = 'disk';
                if (this.state !== GameState.SHOWING_SOLUTION && this.state === GameState.PLAYING) {
                    disk.classList.add('draggable');
                    disk.draggable = true;
                }
                disk.setAttribute('data-size', diskSize);

                // 選択状態のスタイルを追加（一番上のプレートのみ）
                if (this.selectedDisk === index &&
                    diskIndex === this.towers[index].length - 1) {
                    disk.classList.add('selected');
                }

                // 一番上のプレートの場合、移動可能であることを示すスタイルを追加
                if (diskIndex === this.towers[index].length - 1 &&
                    this.state === GameState.PLAYING &&
                    this.state !== GameState.SHOWING_SOLUTION) {
                    disk.style.cursor = 'pointer';
                }

                disk.addEventListener('dragstart', (e) => {
                    if (this.state === GameState.SHOWING_SOLUTION || this.state !== GameState.PLAYING) {
                        e.preventDefault();
                        return;
                    }
                    if (this.isValidDiskToMove(index, diskSize)) {
                        this.dragSource = index;
                        disk.classList.add('dragging');
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
        if (this.state === GameState.SHOWING_SOLUTION || this.state !== GameState.PLAYING) return false;
        const tower = this.towers[towerIndex];
        // 一番上のプレートかどうかを確認
        return tower.length > 0 && tower[tower.length - 1] === diskSize;
    }

    setVolume(value) {
        const volume = parseFloat(value);
        this.audioManager.setVolume(volume);
    }

    calculateScore(moveCount, minMoves, elapsedTime) {
        // 基本スコア: 1000点
        let score = 1000;

        // 移動回数による減点
        const movesPenalty = Math.max(0, moveCount - minMoves) * 10;
        score -= movesPenalty;

        // 時間による減点（1分あたり50点、最大500点）
        let elapsedSeconds;
        if (typeof elapsedTime === 'string') {
            const [minutes, seconds] = elapsedTime.split(':').map(Number);
            elapsedSeconds = minutes * 60 + seconds;
        } else {
            elapsedSeconds = Math.floor(elapsedTime / 1000);
        }

        const timePenalty = Math.min(500, Math.floor(elapsedSeconds / 60) * 50);
        score -= timePenalty;

        // 最低スコアは100点
        return Math.max(100, Math.floor(score));
    }

    handleShowSolution() {
        this.switchScreen(ScreenState.GAME);

        // 1秒後に回答を表示
        setTimeout(() => {
            this.showSolution();
        }, 1000);
    }

    async showSolution() {
        if (this.state === GameState.SHOWING_SOLUTION) {
            return;
        }

        this.state = GameState.SHOWING_SOLUTION;
        this.showSolutionButton.textContent = '回答表示中...';
        this.showSolutionButton.disabled = true;

        try {
            // Reset the game state
            this.initializeTowers();
            this.renderTowers();
            this.moveCount = 0;
            this.updateMoveCount();

            // Solve the puzzle
            await this.solveHanoi(this.TOTAL_DISKS, 0, 1, 2);

            // 解答表示が完了し、かつ状態が変わっていない場合のみリセット
            if (this.state === GameState.SHOWING_SOLUTION) {
                this.showSolutionButton.textContent = '回答を見る';
                this.state = GameState.IDLE;
                this.updateShowSolutionButton();
            }
        } catch (error) {
            console.log('Solution cancelled or error occurred:', error);
            // エラーが発生した場合も状態をリセット
            if (this.state === GameState.SHOWING_SOLUTION) {
                this.cancelSolution();
            }
        }
    }

    async solveHanoi(n, source, auxiliary, target) {
        if (this.state !== GameState.SHOWING_SOLUTION) {
            throw new Error('Solution cancelled');
        }

        if (n === 1) {
            if (this.state !== GameState.SHOWING_SOLUTION) {
                throw new Error('Solution cancelled');
            }
            await this.moveDisk(source, target);
            await new Promise(resolve => setTimeout(resolve, 1000));
            return;
        }

        await this.solveHanoi(n - 1, source, target, auxiliary);
        if (this.state !== GameState.SHOWING_SOLUTION) {
            throw new Error('Solution cancelled');
        }
        await this.moveDisk(source, target);
        await new Promise(resolve => setTimeout(resolve, 1000));
        await this.solveHanoi(n - 1, auxiliary, source, target);
    }

    async moveDisk(fromTower, toTower) {
        if (this.towers[fromTower].length === 0) return;

        const disk = this.towers[fromTower].pop();
        this.towers[toTower].push(disk);
        this.moveCount++;
        this.updateMoveCount();
        this.renderTowers();

        // Play move sound
        this.audioManager.playMoveSound();
    }

    // ハイスコアの保存
    saveHighScore(diskCount, moves, time) {
        if (!diskCount || !moves || !time) return false;

        const key = `highScore_${diskCount}`;
        const currentScore = localStorage.getItem(key);

        // 時間を秒数に変換
        let timeInSeconds;
        if (typeof time === 'string') {
            const [minutes, seconds] = time.split(':').map(Number);
            timeInSeconds = minutes * 60 + seconds;
        } else {
            timeInSeconds = Math.floor(time / 1000);
        }

        const newScore = {
            moves: moves,
            time: timeInSeconds
        };

        try {
            if (!currentScore) {
                localStorage.setItem(key, JSON.stringify(newScore));
                this.loadHighScores();
                this.updateHighScoreDisplay();
                return true;
            }

            const savedScore = JSON.parse(currentScore);
            // 保存されているスコアの時間を秒数に変換（互換性のため）
            let savedTimeInSeconds = typeof savedScore.time === 'string'
                ? this.convertTimeStringToSeconds(savedScore.time)
                : savedScore.time;

            if (moves < savedScore.moves || (moves === savedScore.moves && timeInSeconds < savedTimeInSeconds)) {
                localStorage.setItem(key, JSON.stringify(newScore));
                this.loadHighScores();
                this.updateHighScoreDisplay();
                return true;
            }

            return false;
        } catch (error) {
            console.error('Error saving high score:', error);
            return false;
        }
    }

    // 時間文字列を秒数に変換するヘルパーメソッド
    convertTimeStringToSeconds(timeString) {
        if (!timeString) return 0;
        const [minutes, seconds] = timeString.split(':').map(Number);
        return (minutes * 60) + seconds;
    }

    // ハイスコアの読み込み
    loadHighScores() {
        this.highScores = {};
        // MIN_DISKSからMAX_DISKSまでのスコアを読み込む
        for (let i = CONSTANTS.MIN_DISKS; i <= CONSTANTS.MAX_DISKS; i++) {
            const score = localStorage.getItem(`highScore_${i}`);
            this.highScores[i] = score ? JSON.parse(score) : null;
        }
    }

    // ハイスコア表示の更新
    updateHighScoreDisplay() {
        for (let i = CONSTANTS.MIN_DISKS; i <= CONSTANTS.MAX_DISKS; i++) {
            const score = this.highScores[i];
            const movesElement = document.getElementById(`bestMoves${i}`);
            const timeElement = document.getElementById(`bestTime${i}`);

            if (movesElement && timeElement) {
                if (score) {
                    movesElement.textContent = score.moves;
                    // 時間を適切にフォーマット
                    const formattedTime = typeof score.time === 'number'
                        ? this.formatTime(score.time * 1000)  // 秒数をミリ秒に変換してフォーマット
                        : score.time;
                    timeElement.textContent = formattedTime;
                } else {
                    movesElement.textContent = '--';
                    timeElement.textContent = '--:--';
                }
            }
        }
    }

    switchScreen(screenName) {
        // 全ての画面を非アクティブにする
        Object.values(this.screens).forEach(screen => {
            if (screen) {
                screen.classList.remove('active');
            }
        });

        // 指定された画面をアクティブにする
        const targetScreen = this.screens[screenName];
        if (targetScreen) {
            targetScreen.classList.add('active');
            this.currentScreen = screenName;
        }
    }

    handleGameScreenActivation() {
        // Reset game state if coming from start screen
        if (this.state !== GameState.PLAYING) {
            this.resetGame();
        }
    }

    handleBackToStart() {
        // Stop BGM when returning to start screen
        this.audioManager.stopBGM();
        // 回答表示中の場合は停止
        if (this.state === GameState.SHOWING_SOLUTION) {
            this.cancelSolution();
        }
        // タイマーを停止してリセット
        this.stopTimer();
        this.timerElement.textContent = '00:00';
        this.startTime = null;

        this.switchScreen(ScreenState.START);
        this.resetGame();
    }

    cancelSolution() {
        this.state = GameState.IDLE;
        this.showSolutionButton.textContent = '回答を見る';
        this.showSolutionButton.disabled = false;
    }

    handleBackFromScores() {
        // Return to previous screen (either start or game)
        this.switchScreen(this.state === GameState.PLAYING ? ScreenState.GAME : ScreenState.START);
    }

    stopGame() {
        this.state = GameState.IDLE;
        this.stopTimer();
        this.audioManager.stopBGM();
        this.resetGame();
    }
}

// デバッグ用の関数を追加
function logLayoutInfo() {
    const viewport = {
        width: window.innerWidth,
        height: window.innerHeight,
        visualViewport: window.visualViewport ? {
            width: window.visualViewport.width,
            height: window.visualViewport.height,
            scale: window.visualViewport.scale
        } : 'not supported'
    };

    const towersContainer = document.querySelector('.towers-container');
    const towers = Array.from(document.querySelectorAll('.tower'));
    const containerRect = towersContainer.getBoundingClientRect();

    const layoutInfo = {
        viewport,
        container: {
            width: containerRect.width,
            height: containerRect.height,
            computedStyle: {
                gap: getComputedStyle(towersContainer).gap,
                padding: getComputedStyle(towersContainer).padding
            }
        },
        towers: towers.map(tower => {
            const rect = tower.getBoundingClientRect();
            return {
                width: rect.width,
                height: rect.height,
                computedStyle: {
                    width: getComputedStyle(tower).width,
                    height: getComputedStyle(tower).height
                }
            };
        })
    };

    console.log('Layout Debug Info:', layoutInfo);
}

// 既存のイベントリスナーを拡張
window.addEventListener('load', () => {
    new HanoiTower();
    logLayoutInfo();
});

window.addEventListener('resize', () => {
    logLayoutInfo();
});

// タッチイベントのデバッグ
function logTouchEvent(event) {
    const touch = event.touches[0];
    console.log('Touch Event:', {
        type: event.type,
        position: {
            clientX: touch?.clientX,
            clientY: touch?.clientY
        },
        target: event.target.className
    });
}

document.addEventListener('touchstart', logTouchEvent);
document.addEventListener('touchmove', logTouchEvent);
document.addEventListener('touchend', () => console.log('Touch Event: touchend')); 