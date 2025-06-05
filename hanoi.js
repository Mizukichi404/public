// AudioManager class for handling all audio-related operations
class AudioManager {
    constructor() {
        this.bgm = new Audio('bgm.mp3');
        this.moveSound = new Audio('move.mp3');
        this.successSound = new Audio('success.mp3');
        this.buttonSound = new Audio('button.mp3');

        this.bgm.loop = true;

        // Error handling for audio files
        this.setupErrorHandling();

        // Initialize volume
        this.setVolume(0.5);
    }

    setupErrorHandling() {
        const audioFiles = {
            'move.mp3': this.moveSound,
            'bgm.mp3': this.bgm,
            'success.mp3': this.successSound,
            'button.mp3': this.buttonSound
        };

        for (const [filename, audio] of Object.entries(audioFiles)) {
            audio.onerror = () => console.warn(`Warning: ${filename} could not be loaded`);
        }
    }

    setVolume(value) {
        const audioElements = [this.bgm, this.moveSound, this.successSound, this.buttonSound];
        audioElements.forEach(audio => {
            if (audio) audio.volume = value;
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

    playButtonSound() {
        if (this.buttonSound && this.buttonSound.readyState >= 2) {
            this.buttonSound.currentTime = 0;
            this.buttonSound.play().catch(err => console.warn('Button sound playback failed:', err));
        }
    }
}

// Game state management
const GameState = {
    IDLE: 'idle',
    PLAYING: 'playing',
    PAUSED: 'paused',
    SHOWING_SOLUTION: 'showing_solution'
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
        // DOM要素の初期化を最初に行う
        this.initializeDOMElements();

        // DOM要素が見つからない場合はエラーを表示
        if (!this.validateDOMElements()) {
            console.error('Required DOM elements not found. Please check the HTML structure.');
            return;
        }

        this.audioManager = new AudioManager();
        this.state = GameState.IDLE;
        this.TOTAL_DISKS = CONSTANTS.MIN_DISKS;
        this.towers = [[], [], []];
        this.moveCount = 0;
        this.minMoves = Math.pow(2, this.TOTAL_DISKS) - 1;
        this.selectedDisk = null;
        this.dragSource = null;
        this.startTime = null;
        this.timerInterval = null;
        this.towerButtons = document.querySelectorAll('.tower-button');

        this.setupEventListeners();
        this.setupDragAndDrop();
        this.initializeTowers();
        this.updateMoveCount();
        this.loadHighScores();
        this.updateHighScoreDisplay();
    }

    validateDOMElements() {
        // 必要なDOM要素が存在するか確認
        return (
            this.towerElements &&
            this.towerElements.every(element => element !== null) &&
            this.moveCountElement &&
            this.minMovesElement &&
            this.startGameButton &&
            this.resetButton &&
            this.showSolutionButton &&
            this.diskCountSelect
        );
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

    startGame() {
        try {
            this.audioManager.playButtonSound();
        } catch (err) {
            console.warn('Button sound playback failed:', err);
        }

        this.state = GameState.PLAYING;
        this.startGameButton.disabled = true;
        this.resetButton.disabled = false;
        this.showSolutionButton.disabled = false;
        this.diskCountSelect.disabled = true;

        // 塔の選択ボタンを有効化
        this.towerButtons.forEach(button => {
            button.disabled = false;
        });

        // BGM再生
        this.audioManager.playBGM();

        // タイマー開始
        this.startTimer();
    }

    resetGame() {
        if (this.state === GameState.SHOWING_SOLUTION) {
            this.state = GameState.IDLE;
            this.showSolutionButton.textContent = '回答を見る';
            this.showSolutionButton.disabled = true;
        }

        // ゲーム状態のリセット
        this.state = GameState.IDLE;
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
        this.audioManager.stopBGM();

        // 選択状態をリセット
        this.selectedDisk = null;
        this.dragSource = null;
        this.removeAllHighlights();

        this.initializeTowers();
        this.moveCount = 0;
        this.minMoves = Math.pow(2, this.TOTAL_DISKS) - 1;
        this.updateMoveCount();
        this.stopTimer();
        this.timerElement.textContent = '00:00';
        this.startTime = null;

        try {
            this.audioManager.playButtonSound();
        } catch (err) {
            console.warn('Button sound playback failed:', err);
        }
    }

    handleDiskCountChange() {
        this.TOTAL_DISKS = parseInt(this.diskCountSelect.value);
        this.resetGame();
    }

    handleTowerButtonClick(towerIndex, button) {
        if (this.state !== GameState.PLAYING || this.state === GameState.SHOWING_SOLUTION) return;

        this.audioManager.playButtonSound();

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

    async checkWinCondition() {
        const targetTower = this.towers[2];

        // 目標の塔にすべてのディスクがあるかだけをチェック
        if (targetTower.length === this.TOTAL_DISKS) {
            // ゲームクリア時の処理
            this.stopTimer();
            const elapsedTime = Date.now() - this.startTime;
            const elapsedSeconds = Math.floor(elapsedTime / 1000);

            // BGMの停止
            this.audioManager.stopBGM();

            // クリアアニメーション
            const disks = this.towerElements[2].querySelectorAll('.disk');
            for (let i = disks.length - 1; i >= 0; i--) {
                disks[i].classList.add('success');
                await new Promise(resolve => setTimeout(resolve, 100));
            }

            // 効果音を再生
            this.audioManager.playSuccessSound();

            // スコアを計算
            const score = this.calculateScore(this.moveCount, this.minMoves, elapsedSeconds);

            // ハイスコアの保存を試みる
            const isNewHighScore = this.saveHighScore(
                this.TOTAL_DISKS,
                this.moveCount,
                elapsedTime
            );

            // クリアメッセージを表示
            this.showCongratsMessage(isNewHighScore);

            // 3秒後にゲームをリセット
            setTimeout(() => {
                this.hideCongratsMessage();
                this.resetGame();
            }, 5000);
        }
    }

    showCongratsMessage(isNewHighScore) {
        const timeElapsed = Date.now() - this.startTime;
        this.finalMoveCountElement.textContent = this.moveCount;
        this.finalMinMovesElement.textContent = this.minMoves;
        this.finalTimeElement.textContent = this.formatTime(timeElapsed);

        // ハイスコアメッセージの追加
        const scoreMessage = isNewHighScore ? 'New High Score!' : '';
        this.finalScoreElement.textContent = scoreMessage;

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
        if (this.state === GameState.SHOWING_SOLUTION) return;

        this.state = GameState.SHOWING_SOLUTION;
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
        this.state = GameState.IDLE;
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

    // ハイスコアの保存
    saveHighScore(diskCount, moves, time) {
        const key = `highScore_${diskCount}`;
        const currentScore = localStorage.getItem(key);
        const newScore = { moves, time };

        if (!currentScore) {
            localStorage.setItem(key, JSON.stringify(newScore));
            this.updateHighScoreDisplay();
            return true;
        }

        const savedScore = JSON.parse(currentScore);
        if (moves < savedScore.moves || (moves === savedScore.moves && time < savedScore.time)) {
            localStorage.setItem(key, JSON.stringify(newScore));
            this.updateHighScoreDisplay();
            return true;
        }

        return false;
    }

    // ハイスコアの読み込み
    loadHighScores() {
        this.highScores = {};
        for (let i = 3; i <= 6; i++) {
            const score = localStorage.getItem(`highScore_${i}`);
            this.highScores[i] = score ? JSON.parse(score) : null;
        }
    }

    // ハイスコア表示の更新
    updateHighScoreDisplay() {
        for (let i = 3; i <= 6; i++) {
            const score = this.highScores[i];
            const movesElement = document.getElementById(`bestMoves${i}`);
            const timeElement = document.getElementById(`bestTime${i}`);

            if (score) {
                movesElement.textContent = score.moves;
                timeElement.textContent = this.formatTime(score.time);
            } else {
                movesElement.textContent = '--';
                timeElement.textContent = '--:--';
            }
        }
    }

    formatTime(timeInMilliseconds) {
        const minutes = Math.floor(timeInMilliseconds / 60000);
        const seconds = Math.floor((timeInMilliseconds % 60000) / 1000);
        return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
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