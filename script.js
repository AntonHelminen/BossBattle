// Dude's bizarre boss battle
// Based on the course demo and takes inspiration from I wanna be the guy-fangames, which I have played in the past.
// I used ChatGPT to find bugs in the code and commands for entity destruction handling, trajectory calculation and tween.

let game;

const gameOptions = {
    dudeGravity: 1500,
    dudeSpeed: 300,
    bulletSpeed: 500 // Speed for the bullet
}

window.onload = function() {
    let gameConfig = {
        type: Phaser.AUTO,
        backgroundColor: "#112211",
        scale: {
            mode: Phaser.Scale.FIT,
            autoCenter: Phaser.Scale.CENTER_BOTH,
            width: 1500,
            height: 1000,
        },
        pixelArt: true,
        physics: {
            default: "arcade",
            arcade: {
                gravity: {
                    y: 0
                }
            }
        },
        scene: [PlayGame, EndGame, WinGame]
    }
    game = new Phaser.Game(gameConfig)
    window.focus();
}

class PlayGame extends Phaser.Scene {

    constructor() {
        super("PlayGame")
        this.facingRight = true; // Track the direction the dude is facing
        this.playerhealth = 3; // How many hits the player can take
        this.doubleJump = false; // Track if the player can double jump
        this.bulletCap = 5; // Max bullets on screen
        this.bulletsOnScreen = 0; // Bullet tracker
        this.bossHealth = 100; // Boss health
        this.greyStarHealth = 20; // Miniboss health
        this.timer = 0; // Second passed
    }

    preload() {
        this.load.image("ground", "assets/platform.png")
        this.load.image("star", "assets/star.png")
        this.load.spritesheet("dude", "assets/dude.png", {frameWidth: 32, frameHeight: 48})
        this.load.spritesheet("bullet", "assets/bullet.png", {frameWidth: 1080, frameHeight: 1080, scale: 0.01})
        this.load.image("damaged_star", "assets/damaged_star.png")
        this.load.image("grey_star", "assets/star_enemy.png")
        this.load.image("damaged_grey_star", "assets/star_enemy_damaged.png")
        this.load.image("spike_down", "assets/spike_down.png")

        this.load.audio('music', 'assets/sound/Background_music.mp3');
        this.load.audio('gun', 'assets/sound/gun.mp3');
        this.load.audio('shot', 'assets/sound/shot.mp3');
        this.load.audio('metal_hit', 'assets/sound/metal_hit.mp3');
        this.load.audio('crush', 'assets/sound/crush.mp3');
        this.load.audio('boss_hit', 'assets/sound/boss_hit.mp3');
        this.load.audio('entrance', 'assets/sound/entrance.mp3');
        this.load.audio('death_sound', 'assets/sound/death_sound.mp3');
        this.load.audio('jump', 'assets/sound/jump.mp3');
        
    }
    
    create() {
        
        // Music and sound effects
        this.backgroundMusic = this.sound.add('music');
        this.crush = this.sound.add('crush')
        this.gun = this.sound.add('gun')
        this.shot = this.sound.add('shot')
        this.metal_hit = this.sound.add('metal_hit')
        this.boss_hit = this.sound.add('boss_hit');
        this.entrance = this.sound.add('entrance');
        this.death_sound = this.sound.add('death_sound');
        this.jump = this.sound.add('jump')
    
        this.backgroundMusic.play({
            loop: true,
            volume: 0.12
        });

        // Create boss fight platforms:
        this.groundGroup = this.physics.add.group({
            immovable: true,
            allowGravity: false
        })
        this.groundGroup.create(game.config.width*0.25, game.config.height*0.2, "ground")
        this.groundGroup.create(game.config.width*0.1, game.config.height*0.3, "ground")
        this.groundGroup.create(game.config.width*0.25, game.config.height*0.4, "ground")
        this.groundGroup.create(game.config.width*0.1, game.config.height*0.5, "ground")
        this.groundGroup.create(game.config.width*0.25, game.config.height*0.6, "ground")
        this.groundGroup.create(game.config.width*0.1, game.config.height*0.7, "ground")
        this.groundGroup.create(game.config.width*0.25, game.config.height*0.8, "ground")

        // Spikes 76 for the top of the screen
        this.spikeGroup = this.physics.add.group({
            immovable: true,
            allowGravity: false
        })
        for(let i = 0; i < 76; i++) {
            this.spikeGroup.create(i*20, 5, "spike_down")
        }

        // Create player
        this.dude = this.physics.add.sprite(game.config.width*0.1, game.config.height*0.10, "dude")
        this.dude.body.gravity.y = gameOptions.dudeGravity
        this.physics.add.collider(this.dude, this.groundGroup)
        this.physics.add.overlap(this.dude, this.spikeGroup, this.dudeHitSpike, null, this)

        // Create bullets group
        this.bulletGroup = this.physics.add.group({
            maxSize: this.bulletCap
        })
        this.physics.add.overlap(this.bulletGroup, this.groundGroup, this.bulletHitGround, null, this)
        
        // Setup stars (These are now the enemy bullets)
        this.starsGroup = this.physics.add.group({})
        this.physics.add.overlap(this.dude, this.starsGroup, this.getStarred, null, this)
        
        // Add health display
        this.add.image(16, 33, "star")
        this.healthText = this.add.text(32, 20, this.playerhealth, {fontSize: "30px", fill: "#ffffff"})

        // Timer display
        this.timerText = this.add.text(game.config.width*0.45, 20, "Seconds passed: 0", {fontSize: "30px", fill: "#ffffff"})

        // MINIBOSS
        this.grey_star_group = this.physics.add.group({})
        this.physics.add.overlap(this.dude, this.grey_star_group, this.getHeavyStarred, null, this)
        this.physics.add.overlap(this.bulletGroup, this.grey_star_group, this.bulletHitGreyStar, null, this);

        // BOSS 
        this.star_boss = this.physics.add.sprite(game.config.width*0.9, game.config.height*0.15, "star");
        this.star_boss.setScale(7)
        this.bossHealthText = this.add.text(game.config.width*0.85, 20, "BOSS HP: " + this.bossHealth, {fontSize: "30px", fill: "#ffffff"})
        this.physics.add.overlap(this.bulletGroup, this.star_boss, this.bulletHitBoss, null, this);

        //Add a tween to move the object up and down (From ChatGPT)
        this.tweens.add({
            targets: this.star_boss,
            y: { 
                from: game.config.height*0.15,
                to: game.config.height*0.8
            },
            duration: 3000,
            ease: 'Sine.easeInOut',
            yoyo: true,
            repeat: -1 
        })
  
        // MOVEMENT
        // Cursor keys
        this.cursors = this.input.keyboard.createCursorKeys()
        
        this.shootKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.X)
        this.jumpKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Z)
        this.resetKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R)
        
        // Turning to left and left movement
        this.anims.create({
            key: "left",
            frames: this.anims.generateFrameNumbers("dude", {start: 0, end: 3}),
            frameRate: 10,
            repeat: -1
        })

        this.anims.create({
            key: "halt_left",
            frames: [{key: "dude", frame: 2}],
            frameRate: 10,
        })

        this.anims.create({
            key: "shoot_left",
            frames: [{key: "dude", frame: 0}],
            frameRate: 10,
            repeat: -1
        })

        
        // Turning to right and right movement
        this.anims.create({
            key: "right",
            frames: this.anims.generateFrameNumbers("dude", {start: 5, end: 9}),
            frameRate: 10,
            repeat: -1
        })

        this.anims.create({
            key: "halt_right",
            frames: [{key: "dude", frame: 5}],
            frameRate: 10,
        })

        this.anims.create({
            key: "shoot_right",
            frames: [{key: "dude", frame: 7}],
            frameRate: 10,
            repeat: -1
        })

        // Boss attacks cycle
        this.triggerTimer = this.time.addEvent({
            callback: this.homing_star_attack,
            callbackScope: this,
            delay: 1000, // Starts after 1 second
            loop: false
        })

        // Grey star miniboss summon
        this.triggerTimer = this.time.addEvent({
            callback: this.spawn_grey_star,
            callbackScope: this,
            delay: 30000, // Spawns every 30 seconds
            loop: true
        })

        // Game becomes more annoying after 60 seconds have passed
        this.triggerTimer = this.time.addEvent({
            callback: this.spawn_random360,
            callbackScope: this,
            delay: 60000, // Spawns after 60 seconds
            loop: false
        })

        this.triggerTimer = this.time.addEvent({
            callback: this.timer_update,
            callbackScope: this,
            delay: 1000, // Updates every second
            loop: true
        })

    }

    refreshScreen() {
        window.location.reload();
    }

    // Function to handle shooting
    shoot() {

        this.gun.play({
            loop: false,
            volume: 0.12
        });

        let bullet;
        if (this.facingRight) {
            bullet = this.bulletGroup.create(this.dude.x + 20, this.dude.y+10, 'bullet');
        } else {
            bullet = this.bulletGroup.create(this.dude.x - 20, this.dude.y+10, 'bullet');
        }
        
        bullet.setScale(0.05);
        
        if (this.facingRight) {
            bullet.body.velocity.x = gameOptions.bulletSpeed;
        } else {
            
            bullet.body.velocity.x = -gameOptions.bulletSpeed;
        }
        bullet.body.allowGravity = false; 
    }
    // Spawn enemy grey star
    spawn_grey_star() {
        this.entrance.play({
            loop: false,
            volume: 0.5
        });
        let grey_star;
        grey_star = this.grey_star_group.create(game.config.width, game.config.height*0.5, 'grey_star');
        grey_star.setScale(30)
        grey_star.body.velocity.x = -gameOptions.bulletSpeed*0.3
        grey_star.body.velocity.y = 0
        
    }

    timer_update() {
        this.timer += 1;
        this.timerText.setText("Seconds passed: " + this.timer)
    }

    // The boss Shoots ten stars at the players current position
    homing_star_attack() {
        this.time.delayedCall(1000, () => {
            for(let i = 0; i < 10; i++) {
                this.time.delayedCall(i*1000, () => {

                    this.shot.play({
                        loop: false,
                        volume: 0.2
                    });

                    let star;
                    star = this.starsGroup.create(this.star_boss.x-20, this.star_boss.y, 'star');
                    star.setScale(2)
                    const dx = this.dude.x - star.x;
                    const dy = this.dude.y - star.y;

                    const angle = Math.atan2(dy, dx);

                    star.body.velocity.x = Math.cos(angle) * gameOptions.bulletSpeed*1.1;
                    star.body.velocity.y = Math.sin(angle) * gameOptions.bulletSpeed*1.1;

                    star.body.allowGravity = false;
                    if (i >= 9) {
                        this.star_rain();
                    }
                }, [], this); 
            }
        }, [], this);
    }
    // The boss rains down stars
    star_rain() {
        this.time.delayedCall(1000, () => {
            for(let i = 0; i < 100; i++) {
                this.time.delayedCall(i*100, () => {
                    this.shot.play({
                        loop: false,
                        volume: 0.2
                    });

                    let star;
                    star = this.starsGroup.create(Phaser.Math.Between(0, game.config.width), 0, 'star');
                    star.body.velocity.y = gameOptions.bulletSpeed*1;

                    star.body.allowGravity = false;

                
                    if (i >= 99) {
                        this.star_pain();
                    }
                }, [], this);
            }
        }, [], this);
    }
    star_pain() {
        this.time.delayedCall(1000, () => {
            for(let i = 0; i < 15; i++) {
                this.time.delayedCall(i*300, () => {
                    this.shot.play({
                        loop: false,
                        volume: 0.2
                    });

                    let star;
                    star = this.starsGroup.create(this.star_boss.x, Phaser.Math.Between(0, game.config.height), 'star');
                    star.setScale(2)
                    const dx = this.dude.x - star.x;
                    const dy = this.dude.y - star.y;

                    const angle = Math.atan2(dy, dx);

                    star.body.velocity.x = Math.cos(angle) * gameOptions.bulletSpeed*1.1;
                    star.body.velocity.y = Math.sin(angle) * gameOptions.bulletSpeed*1.1;

                    star.body.allowGravity = false;
                    if (i >= 14) {
                        this.star_ascent();
                    }
                }, [], this); 
            }

        }, [], this);
    }
    star_ascent() {
        this.time.delayedCall(1000, () => {
            for(let i = 0; i < 100; i++) {
                this.time.delayedCall(i*100, () => {
                    this.shot.play({
                        loop: false,
                        volume: 0.2
                    });

                    let star;
                    star = this.starsGroup.create(Phaser.Math.Between(0, game.config.width), game.config.height, 'star');
                    star.body.velocity.y = -gameOptions.bulletSpeed*1;

                    star.body.allowGravity = false;

                
                    if (i >= 99) {
                        this.star_wave_attack();
                    }
                }, [], this);
            }
        }, [], this);
    }
     // The boss spawns two waves of stars
    star_wave_attack() {
        this.time.delayedCall(1000, () => {
            for(let i = 0; i < 100; i++) {
                this.time.delayedCall(i*100, () => {
                    this.shot.play({
                        loop: false,
                        volume: 0.2
                    });

                    let star;
                    let star2;
                    star = this.starsGroup.create(this.star_boss.x-20, this.star_boss.y-300, 'star');
                    star2 = this.starsGroup.create(this.star_boss.x-20, this.star_boss.y+300, 'star');
                    star.body.velocity.x = -gameOptions.bulletSpeed*0.55;
                    star2.body.velocity.x = -gameOptions.bulletSpeed*0.55;
                }, [], this);
            }
        }, [], this);

        // Start the attack cycle again after this cycle has finished
        this.time.delayedCall(11000, () => {
            this.triggerTimer = this.time.addEvent({
                callback: this.homing_star_attack,
                callbackScope: this,
                delay: 0,
                loop: false
            });
        }, [], this);
    }
    spawn_random360() {
        this.time.delayedCall(1000, () => {
            for(let i = 0; i < 1000; i++) {
                this.time.delayedCall(i*200, () => {
                    this.shot.play({
                        loop: false,
                        volume: 0.2
                    });

                    let star;
                    star = this.starsGroup.create(game.config.width*0.6, game.config.height*0.5, 'star');
                    let randomAngle = Phaser.Math.Angle.Random();

                    // Calculate velocity components using trigonometry
                    let velocityX = Math.cos(randomAngle) * gameOptions.bulletSpeed*0.5;
                    let velocityY = Math.sin(randomAngle) * gameOptions.bulletSpeed*0.5;

                    // Apply the velocity to the star
                    star.body.velocity.x = velocityX;
                    star.body.velocity.y = velocityY;
   
                }, [], this);
            }
        }, [], this);
    }

    getStarred(dude, star) {
        this.metal_hit.play({
            loop: false,
            volume: 0.7
        });
        star.disableBody(true, true)
        this.playerhealth -= 1
        this.healthText.setText(this.playerhealth)
    }
    dudeHitSpike(dude, spike) {
        this.crush.play({
            loop: false,
            volume: 0.7
        });
        this.playerhealth = 0
        this.healthText.setText(this.playerhealth)
    }
    getHeavyStarred(dude, grey_star) {
        this.playerhealth = 0
        this.healthText.setText(this.playerhealth)
    }

    bulletHitGround(bullet) {
        bullet.disableBody(true, true)
        bullet.destroy();
        this.bulletsOnScreen -= 1;
    }

    bulletHitBoss(boss, bullet) {
        this.time.delayedCall(5, () => {
            this.boss_hit.play({
                loop: false,
                volume: 0.2
            });
        }, [], this);

        bullet.disableBody(true, true)
        bullet.destroy();
        this.bulletsOnScreen -= 1;
        this.bossHealth -= 1;
        this.bossHealthText.setText("BOSS HP: " + this.bossHealth)

        this.star_boss.setTexture('damaged_star');
        this.time.delayedCall(100, () => {
            this.star_boss.setTexture('star');
        }, [], this);
    }

    bulletHitGreyStar(bullet, grey_star) {
        if (!grey_star.active) {
            return; // If grey_star is not active, do nothing
        }
        
        bullet.disableBody(true, true);
        bullet.destroy();
        this.bulletsOnScreen -= 1;
        this.greyStarHealth -= 1;
    
        if (this.greyStarHealth <= 0) {
            this.crush.play({
                loop: false,
                volume: 1
            });
    
            // Ensure all tweens or events related to grey_star are killed before destruction
            this.tweens.killTweensOf(grey_star);
            grey_star.body.setEnable(false);
            this.physics.world.disable(grey_star);
    
            grey_star.setActive(false).setVisible(false);
    
            // Prevent any future interaction with grey_star after destruction
            grey_star.destroy();
            this.greyStarHealth = 25;
    
            // Stop timer or mark fight as complete
            this.timerText.setText(`Fight Complete! Time: ${this.timerText.text.split(': ')[1]}`);
    
        } else {
            this.time.delayedCall(5, () => {
                this.metal_hit.play({
                    loop: false,
                    volume: 0.7
                });
            }, [], this);
    
            // Safeguard delayed call with a check if grey_star is still valid
            grey_star.setTexture('damaged_grey_star');
            this.time.delayedCall(100, () => {
                if (grey_star && grey_star.active) { // Only set texture if grey_star still exists and is active
                    grey_star.setTexture('grey_star');
                }
            }, [], this);
        }
    }
    

    update() {
        // Handle player movement
        if (this.cursors.left.isDown) {
            this.dude.body.velocity.x = -gameOptions.dudeSpeed
            this.dude.anims.play("left", true)
            this.facingRight = false; // Player is facing left
        
        } else if (this.cursors.right.isDown) {
            this.dude.body.velocity.x = gameOptions.dudeSpeed
            this.dude.anims.play("right", true)
            this.facingRight = true; // Player is facing right
        
        } else {
            this.dude.body.velocity.x = 0
            if (this.facingRight) {
                this.dude.anims.play("halt_right", true)
            } else {
                this.dude.anims.play("halt_left", true)
            }
        }

        // Jump and double jump logic
        if (Phaser.Input.Keyboard.JustDown(this.jumpKey)) {
            if (this.dude.body.touching.down) {
                this.dude.body.velocity.y = -600; // Perform first jump
                this.jump.play({
                    loop: false,
                    volume: 1
                });
                this.doubleJump = true;
            } 
            else if (this.doubleJump) {
                this.dude.body.velocity.y = -600; // Perform double jump
                this.jump.play({
                    loop: false,
                    volume: 1
                });
                this.doubleJump = false; 
            }
        }

        if (this.dude.body.touching.down) {
            this.doubleJump = true;
        }

        // Shooting with X
        if (Phaser.Input.Keyboard.JustDown(this.shootKey) && this.bulletsOnScreen < this.bulletCap) {
            this.shoot();
            if (this.facingRight) {
                this.dude.anims.play("shoot_right", true)
            }
            else {
                this.dude.anims.play("shoot_left", true)
            }
            this.bulletsOnScreen += 1
        }

        if (Phaser.Input.Keyboard.JustDown(this.resetKey)) {
            this.refreshScreen()
        }

        // Remove bullets and stars when they leave the screen
        this.bulletGroup.children.each((bullet) => {
            if (bullet.x > game.config.width || bullet.x < 0) {
                bullet.destroy(); // Destroy bullets when they go off-screen
                this.bulletsOnScreen -= 1; // Decrease bullet count
            }
        }, this);

        this.starsGroup.children.each((star) => {
            if (star.x > game.config.width || star.x < 0) {
                star.destroy();
            }
        }, this);

        // Game end conditions
        if (this.dude.y > game.config.height || this.dude.y < 0) {
            this.backgroundMusic.stop();
            this.death_sound.play({
                loop: false,
                volume: 1
            });
            this.scene.start("EndGame")
        }
        if (this.playerhealth <= 0) {
            this.backgroundMusic.stop();
            this.death_sound.play({
                loop: false,
                volume: 1
            });
            this.scene.start("EndGame")
        }
        if (this.bossHealth <= 0) {
            this.backgroundMusic.stop();
            this.crush.play({
                loop: false,
                volume: 1
            });
            this.scene.start("WinGame")
        }
    }
}

class EndGame extends Phaser.Scene {
    constructor() {
        super("EndGame")
    }
    preload() {
        this.load.audio('death_music', 'assets/sound/Death_music.mp3');
    }
    create() {

        this.death_music = this.sound.add('death_music');
    
        this.death_music.play({
            loop: true,
            volume: 2
        });

        this.failtext = this.add.text(game.config.width*0.25, game.config.height*0.20, "You died. It happens. And will happen again.", {fontSize: "30px", fill: "#ffffff"})
        this.instructiontext = this.add.text(game.config.width*0.32, game.config.height*0.30, "Refresh page (R) to try again.", {fontSize: "30px", fill: "#808080"})
        this.instructiontext2 = this.add.text(game.config.width*0.3, game.config.height*0.40, "Oh, right. The controls are:", {fontSize: "30px", fill: "#808080"})
        this.instructiontext3 = this.add.text(game.config.width*0.3, game.config.height*0.45, "'Left' and 'right' for movement", {fontSize: "30px", fill: "#808080"})
        this.instructiontext4 = this.add.text(game.config.width*0.3, game.config.height*0.50, "'Z' for jump", {fontSize: "30px", fill: "#808080"})
        this.instructiontext5 = this.add.text(game.config.width*0.3, game.config.height*0.55, "'X' for shoot", {fontSize: "30px", fill: "#808080"})
        this.instructiontext5 = this.add.text(game.config.width*0.3, game.config.height*0.60, "'R' to reset screen", {fontSize: "30px", fill: "#808080"})
        this.instructiontext5 = this.add.text(game.config.width*0.3, game.config.height*0.70, "You can double jump and you can", {fontSize: "30px", fill: "#808080"})
        this.instructiontext5 = this.add.text(game.config.width*0.3, game.config.height*0.75, "shoot max 5 bullets at a time.", {fontSize: "30px", fill: "#808080"})
        
        this.resetKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R)
    }
    refreshScreen() {
        window.location.reload();
    }
    update() {
        if (Phaser.Input.Keyboard.JustDown(this.resetKey)) {
            this.refreshScreen()
        }
    }
}
class WinGame extends Phaser.Scene {
    constructor() {
        super("WinGame")
    }
    preload() {
        this.load.image("star", "assets/star.png")
        this.load.audio('victory', 'assets/sound/victory.mp3');
    }
    create() {
        this.backgroundMusic = this.sound.add('victory');
    
        this.backgroundMusic.play({
            loop: false,
            volume: 1
        });

        this.wintext = this.add.text(game.config.width*0.42, game.config.height*0.45, "You're winner!", {fontSize: "30px", fill: "#ffffff"})
        this.instructiontext = this.add.text(game.config.width*0.32, game.config.height*0.55, "Refresh page (R) to play again.", {fontSize: "30px", fill: "#808080"})

        this.resetKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R)

        
        this.add.image(game.config.width*0.5, game.config.height*0.25, "star").setScale(10)
    }
    refreshScreen() {
        window.location.reload();
    }
    update() {
        if (Phaser.Input.Keyboard.JustDown(this.resetKey)) {
            this.refreshScreen()
        }
    }
}
