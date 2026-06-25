// 1. GLOBAL DATA & STATE
 
let userDB = JSON.parse(localStorage.getItem('NGS_PRODUCTION_DB')) || {};
let u = sessionStorage.getItem('ActiveSession'); 
let slideIndex = 0;
let activeQuiz = null;

const knowledgeBase = {
    "Math": {
        "7": ["Basic Fractions", "Integers", "Geometric Shapes"],
        "8": ["Linear Equations", "Square Roots", "Pythagorean Theorem"],
        "9": ["Polynomials", "Quadratic Equations", "Trigonometry"]
    },
    "Physics": {
        "7": ["Physical Quantities", "Measuring Length"],
        "8": ["Speed and Velocity", "Force and Motion"],
        "9": ["Work and Energy", "Pressure"]
    },
    "Chemistry": {
        "7": ["Atoms and Molecules", "States of Matter"],
        "8": ["The Periodic Table", "Acids and Bases"],
        "9": ["Chemical Reactions"]
    },
    "Biology": {
        "7": ["Cells: The Unit of Life", "Photosynthesis"],
        "8": ["Human Body Systems"],
        "9": ["Ecosystems and Food Webs", "Genetics and DNA"]
    },
    "Earth Science": {
        "7": ["The Water Cycle", "Weather and Climate"],
        "8": ["Layers of the Earth", "Plate Tectonics"],
        "9": ["Solar System and Space"]
    }
};

 
// 2. MASTER SAVE & SYNC
 
function saveAndSync() {
    if (u && userDB[u]) {
        if (!userDB[u].inventory) userDB[u].inventory = [];
        if (!userDB[u].unlockedThemes) userDB[u].unlockedThemes = [];
        if (userDB[u].points === undefined) userDB[u].points = 0;
    }
    localStorage.setItem('NGS_PRODUCTION_DB', JSON.stringify(userDB));
    if (u) sessionStorage.setItem('ActiveSession', u);
    syncAppState();
}

function syncAppState() {
    if (!u || !userDB[u]) return;
    const user = userDB[u];

    syncPointsUI();
    if(document.getElementById('userNameHeader')) document.getElementById('userNameHeader').innerText = u.toUpperCase();
    if(document.getElementById('profileNameDisplay')) document.getElementById('profileNameDisplay').innerText = u;
    if(document.getElementById('gradeVal')) document.getElementById('gradeVal').innerText = `Grade ${user.grade}`;
    if(document.getElementById('rankVal')) document.getElementById('rankVal').innerText = calculateRank(user.points);

    applyTheme(user.activeTheme);
    updateAvatarGender();
    updateVisuals();
    updateDailyUI();
    refreshShopButtons();
}

 
// 3. CORE POINT SYSTEM
 
function addPoints(amount, reason) {
    if (!u || !userDB[u]) return;

    const finalAmount = amount;
    userDB[u].points += finalAmount;

    saveAndSync(); 
    showAlert(`Earned ${finalAmount} PTS for: ${reason}`);
    triggerPointAnim(finalAmount, false);
}

function updatePointsUI() {
    const user = userDB[u];
    if (!user) return;

    // 1. Always pull the FRESH value from the database
    const currentPoints = user.points;

    // 2. Set the text directly (do not use += or math here)
    const display = document.getElementById('userPointsDisplay');
    if (display) {
        display.innerText = currentPoints; 
    }
    
    // 3. Optional: Print to console to see if they match
    console.log("UI Displayed:", currentPoints, "Database Value:", user.points);
}

function syncPointsUI() {
    if (!u || !userDB[u]) return;
    
    // This finds all possible points displays
    const pts = document.querySelectorAll('.pts-val, #shopPointsDisplay, #userPointsDisplay');
    
    pts.forEach(el => { 
        // SAFETY CHECK: Only update if the element was actually found
        if (el !== null) { 
            el.innerText = userDB[u].points; 
        }
    });
}
function triggerPointAnim(amt, isMinus) {
    const activeView = document.querySelector('.view.active');
    const balanceElement = activeView?.querySelector('#shopPointsDisplay') || document.querySelector('#shopPointsDisplay');
    if (balanceElement) {
        const p = document.createElement('div');
        p.className = `points-popup ${isMinus ? 'minus' : ''}`;
        p.innerText = (isMinus ? '-' : '+') + amt;
        balanceElement.parentElement.appendChild(p);
        setTimeout(() => p.remove(), 1200);
    }
}

 
// 4. NAVIGATION & AUTH
 
function navigateTo(viewId, tabElement) {
        // Hide all views
    document.querySelectorAll('.view').forEach(view => {
        view.classList.remove('active');
    });
    
    // Deactivate all tabs
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.classList.remove('active');
    });

    // Show the target view
    const target = document.getElementById(viewId);
    if (target) {
        target.classList.add('active');
    }

    // Mark the tab as active
    if (tabElement) {
        tabElement.classList.add('active');
    }

    // CRITICAL: If returning to Ebooks, make sure the subjects are visible
    if (viewId === 'vEbooks') {
        const lib = document.getElementById('subjectLibrary');
        const tv = document.getElementById('topicView');
        if (lib) lib.classList.remove('hidden');
        if (tv) tv.classList.add('hidden'); 
    }

    const quiz_var = document.getElementById('vQuiz')
    
    if (quiz_var) {
        if (viewId === 'vQuiz') quiz_var.classList.remove('hidden'); else quiz_var.classList.add('hidden');
    }

    const game_var = document.getElementById('vGames')
    if (game_var) {
        if (viewId === 'vGames') game_var.classList.remove('hidden'); else game_var.classList.add('hidden');
    }

    const lobby_view = document.getElementById('QuickReactionLobbyView')
    if (lobby_view) {
        if (viewId === 'QuickReactionLobbyView') lobby_view.classList.remove('hidden'); else lobby_view.classList.add('hidden');
    }

    const startgame_view = document.getElementById('QuickReactionGameView')
    if (startgame_view) {
        if (viewId === 'QuickReactionGameView') startgame_view.classList.remove('hidden'); else startgame_view.classList.add('hidden');
    }
    
    // Clear intervals if navigating away from game rooms unexpectedly
    if (viewId === 'QuickReactionGameView') {
        clearInterval(qrTimerInstance);
        qrIsFrozen = false;
    }

    const startcw_view = document.getElementById('CrosswordGameView')
    if (startcw_view) {
        if (viewId === 'CrosswordGameView') startcw_view.classList.remove('hidden'); else startcw_view.classList.add('hidden');
    }

    syncPointsUI();
    setupAllLearnButtons();
} 


function showAuthPage(view) {
    const login = document.getElementById('loginForm');
    const signup = document.getElementById('signupForm');
    if (view === 'signup') {
        login.classList.add('hidden'); signup.classList.remove('hidden');
    } else {
        signup.classList.add('hidden'); login.classList.remove('hidden');
    }
}

function togglePasswordVisibility(id) {
    const field = document.getElementById(id);
    if (field) field.type = (field.type === "password") ? "text" : "password";
}

function handleSignup() {
    const user = document.getElementById('sUser').value.trim();
    const pass = document.getElementById('sPass').value;
    const grade = document.getElementById('sGrade').value;
    const gen = document.querySelector('input[name="sGender"]:checked');
    if (!user || !pass || !grade || !gen) return showAlert("Fill all fields!");

    userDB[user] = {
        password: pass, gender: gen.value, grade: grade,
        points: 0, inventory: [], unlockedThemes: ['default'],
        activeTheme: 'default', activeGlow: null, equippedItem: null, lastClaim: 0
    };
    u = user; 
    saveAndSync();
    document.getElementById('authLayer').classList.add('hidden');
    document.getElementById('appLayer').classList.remove('hidden');
}

function handleLogin() {
    const userInp = document.getElementById('lUser').value.trim();
    const passInp = document.getElementById('lPass').value;
    if (userDB[userInp] && userDB[userInp].password === passInp) {
        u = userInp;
        saveAndSync();
        document.getElementById('authLayer').classList.add('hidden');
        document.getElementById('appLayer').classList.remove('hidden');
    } else {
        showAlert("Invalid credentials!");
    }
}

function closeTopicView() {
    document.getElementById('topicView').classList.add('hidden');
    document.getElementById('subjectLibrary').classList.remove('hidden');
}

function openTopicView() {
    document.getElementById('topicView').classList.remove('hidden')
    document.getElementById('subjectLibrary').classList.add('hidden')
}

function renderTopics(topics) {
    const list = document.getElementById('topicList');
    if (list) {
        list.innerHTML = topics.map(t => `
            <div class="grid-item">
                <h3>${t}</h3>
                <button class="btn-learn" data-learn-topic="${t.replace(/"/g, '&quot;')}">LEARN</button>
            </div>
        `).join('');
    }
}

function openSubject(subject) {
    const grade = (userDB[u] && userDB[u].grade) ? String(userDB[u].grade) : '9';
    const listEl = document.getElementById('topicList');
    const subjLib = document.getElementById('subjectLibrary');
    const topicView = document.getElementById('topicView');
    const activeDisplay = document.getElementById('activeSubjectDisplay');

    // Get topics for this subject and the user's grade; fallback to combined list
    let topics = (knowledgeBase[subject] && knowledgeBase[subject][grade]) ? knowledgeBase[subject][grade].slice() : [];
    if (!topics || topics.length === 0) {
        // Try aggregating across grades
        if (knowledgeBase[subject]) {
            Object.keys(knowledgeBase[subject]).forEach(g => {
                topics = topics.concat(knowledgeBase[subject][g] || []);
            });
        }
    }

    if (!listEl || !topicView || !subjLib) return;

    subjLib.classList.add('hidden');
    topicView.classList.remove('hidden');
    if (activeDisplay) activeDisplay.innerText = subject;

    renderTopics(topics || []);
}

const lessonRepo = {
     // === Grade 7 ===
    "Basic Fractions": {
        overview: "Fractions represent a part of a whole, consisting of a numerator and a denominator.",
        content: "A <b>fraction</b> is written as a/b. The numerator (a) is the number of parts we have, and the denominator (b) is the total number of equal parts in the whole.",
        steps: [
            "Identify the numerator and denominator.",
            "Understand proper, improper, and mixed fractions.",
            "Simplify fractions by finding the Greatest Common Divisor (GCD)."
        ],
        tip: "Multiplying the top and bottom by the same number keeps the fraction equivalent!"
    },
    "Integers": {
        overview: "Integers are whole numbers that can be positive, negative, or zero.",
        content: "Integers do not include fractions or decimals. On a number line, positive integers are to the right of zero, and negative integers are to the left.",
        steps: [
            "Understand the number line.",
            "Learn the rules for adding and subtracting negative numbers.",
            "Remember: a negative times a negative equals a positive."
        ],
        tip: "Think of negative numbers as debt and positive numbers as cash!"
    },
    "Geometric Shapes": {
        overview: "Geometry involves the study of different shapes, sizes, and properties of space.",
        content: "Basic 2D shapes include squares, circles, and triangles. Each has unique properties like perimeter (distance around) and area (space inside).",
        steps: [
            "Identify polygons based on their number of sides.",
            "Learn the area formulas (e.g., Area of a rectangle = length × width).",
            "Understand the difference between 2D and 3D shapes."
        ],
        tip: "A circle is the only shape that doesn't have any corners or straight sides!"
    },
    "Physical Quantities": {
        overview: "Physical quantities are properties of materials that can be quantified by measurement.",
        content: "Every measurement has a <b>magnitude</b> (the number) and a <b>unit</b> (like meters or kilograms).",
        steps: [
            "Distinguish between base quantities (mass, length, time) and derived quantities (volume, speed).",
            "Learn the SI units for each quantity.",
            "Understand how to use measurement tools like scales and stopwatches."
        ],
        tip: "Always include the unit, or your measurement won't make sense!"
    },
    "Measuring Length": {
        overview: "Length is the measurement of something from end to end.",
        content: "The standard SI unit for length is the <b>meter (m)</b>. For very small things, we use millimeters; for long distances, we use kilometers.",
        steps: [
            "Choose the right tool (ruler, measuring tape, or vernier calipers).",
            "Avoid parallax error by looking straight down at the scale.",
            "Learn to convert between mm, cm, m, and km."
        ],
        tip: "Measure twice, cut once!"
    },

     // === Grade 8 ===
    "Linear Equations": {
        overview: "A linear equation is an algebraic equation where each term is either a constant or a variable raised to the first power.",
        content: "The most common form is <b>y = mx + b</b>, where 'm' is the slope and 'b' is the y-intercept.",
        steps: [
            "Isolate the variable on one side of the equation.",
            "Perform the same operation on both sides to keep it balanced.",
            "Graph the equation to see a straight line."
        ],
        tip: "Whatever you do to the left side, you MUST do to the right side!"
    },
    "Square Roots": {
        overview: "A square root of a number is a value that, when multiplied by itself, gives the original number.",
        content: "The symbol for square root is <b>√</b>. For example, √25 = 5 because 5 × 5 = 25.",
        steps: [
            "Identify perfect squares (1, 4, 9, 16, 25...).",
            "Understand that negative numbers do not have real square roots.",
            "Learn to estimate square roots for non-perfect squares."
        ],
        tip: "Square roots and squaring a number are opposites!"
    },
    "Pythagorean Theorem": {
        overview: "A fundamental rule in geometry for right-angled triangles.",
        content: "In a right triangle, <b>a² + b² = c²</b>, where 'c' is the longest side (hypotenuse).",
        steps: [
            "Locate the right angle.",
            "Plug the side lengths into the formula.",
            "Solve for the missing side using square roots."
        ],
        tip: "The hypotenuse is always opposite the 90-degree angle."
    },
    "Speed and Velocity": {
        overview: "These terms describe how fast an object moves, but velocity includes direction.",
        content: "<b>Speed = Distance / Time</b>. <b>Velocity = Displacement / Time</b> in a specific direction.",
        steps: [
            "Calculate average speed using total distance.",
            "Identify the direction for velocity (e.g., 5 m/s North).",
            "Recognize the units are usually m/s or km/h."
        ],
        tip: "If a car drives in a circle at a constant speed, its velocity is constantly changing!"
    },
    "Force and Motion": {
        overview: "Force is a push or pull that causes an object to change its motion.",
        content: "Forces can make objects start moving, stop moving, or change direction. Friction and Gravity are common forces.",
        steps: [
            "Understand that Force = Mass × Acceleration (F=ma).",
            "Identify balanced vs. unbalanced forces.",
            "Measure force in Newtons (N)."
        ],
        tip: "Unbalanced forces are what make things accelerate!"
    },

     // === Grade 9 ===
    "Polynomials": {
        overview: "Polynomials are algebraic expressions consisting of variables and coefficients.",
        content: "Examples include monomials (3x), binomials (x + 5), and trinomials (x² + 2x + 1).",
        steps: [
            "Identify the degree of the polynomial (the highest power).",
            "Learn to add, subtract, and multiply polynomial terms.",
            "Practice factoring common terms out of the expression."
        ],
        tip: "Keep your like-terms organized so you don't get confused!"
    },
    "Quadratic Equations": {
        overview: "A quadratic equation is a second-degree polynomial equation.",
        content: "The standard form is <b>ax² + bx + c = 0</b>. These equations usually have two solutions.",
        steps: [
            "Solve by factoring if possible.",
            "Use the Quadratic Formula: x = [-b ± √(b² - 4ac)] / 2a.",
            "Recognize the 'U' shape (parabola) when graphed."
        ],
        tip: "The '±' sign means you will usually get two different answers!"
    },
    "Trigonometry": {
        overview: "Trigonometry studies the relationships between the angles and sides of triangles.",
        content: "The three main functions are <b>Sine (Sin), Cosine (Cos), and Tangent (Tan)</b>.",
        steps: [
            "Remember SOH CAH TOA.",
            "Sin = Opposite / Hypotenuse.",
            "Cos = Adjacent / Hypotenuse.",
            "Tan = Opposite / Adjacent."
        ],
        tip: "Always make sure your calculator is in 'Degree' mode for school math!"
    },
    "Work and Energy": {
        overview: "Work is done when a force moves an object. Energy is the ability to do work.",
        content: "<b>Work = Force × Distance</b>. Energy can be Kinetic (motion) or Potential (stored).",
        steps: [
            "Measure Work and Energy in Joules (J).",
            "Understand the Law of Conservation of Energy (energy is never lost).",
            "Calculate Potential Energy using height and gravity."
        ],
        tip: "If the object doesn't move, no work was done!"
    },
    "Pressure": {
        overview: "Pressure is the amount of force applied over a specific area.",
        content: "The formula is <b>Pressure = Force / Area</b>. The unit is the Pascal (Pa).",
        steps: [
            "Understand that smaller areas create higher pressure (like a needle).",
            "Learn how liquid and air pressure change with depth/altitude.",
            "Calculate pressure using Newtons and square meters."
        ],
        tip: "This is why snowshoes work—they spread your weight over a larger area!"
    },
 
    // CHEMISTRY
 
    "Atoms and Molecules": { // Grade 7
        overview: "Atoms are the basic building blocks of all matter.",
        content: "An atom consists of a nucleus (protons and neutrons) surrounded by electrons.",
        steps: ["Identify subatomic particles.", "Understand Atomic Numbers.", "Learn how bonds form."],
        tip: "Everything you see is made of atoms!"
    },
    "The Periodic Table": { // Grade 8
        overview: "A chart that organizes all known chemical elements.",
        content: "Elements are arranged by atomic number in rows (periods) and columns (groups).",
        steps: ["Locate symbols like H or O.", "Find Metals vs Non-metals.", "Identify group properties."],
        tip: "Noble gases in Group 18 rarely react with anything!"
    },
    "Chemical Reactions": { // Grade 9
        overview: "When substances change into entirely new substances.",
        content: "Reactants go in, products come out. Bonds are broken and reformed.",
        steps: ["Identify Reactants.", "Look for color or heat changes.", "Write simple equations."],
        tip: "Burning wood is chemical; melting ice is physical!"
    },

 
    // BIOLOGY

    "Cells: The Unit of Life": { // Grade 7
        overview: "The smallest functional units of all living things.",
        content: "Cells can be Prokaryotic (simple) or Eukaryotic (complex with a nucleus).",
        steps: ["Identify the Nucleus.", "Learn about Mitochondria.", "Compare Plant vs Animal cells."],
        tip: "You have trillions of cells working together right now!"
    },
    "Human Body Systems": { // Grade 8
        overview: "Groups of organs working together to keep us alive.",
        content: "Key systems include Circulatory, Respiratory, and Digestive.",
        steps: ["Circulatory: Moves blood.", "Digestive: Breaks down food.", "Nervous: Sends signals."],
        tip: "Your heart is a muscle that never gets tired!"
    },
    "Ecosystems and Food Webs": { // Grade 9
        overview: "How living things interact with their environment.",
        content: "Energy flows from Producers (plants) to Consumers (animals).",
        steps: ["Identify Producers.", "Understand Decomposers.", "Trace a food chain (Grass -> Frog)."],
        tip: "Removing one part can collapse the whole web!"
    },

 
    // EARTH SCIENCE
 
    "The Water Cycle": { // Grade 7
        overview: "The continuous movement of water around the Earth.",
        content: "Driven by the sun, water moves through land, oceans, and the atmosphere.",
        steps: ["Evaporation (liquid to gas).", "Condensation (forming clouds).", "Precipitation (rain/snow)."],
        tip: "The water you drink is as old as the dinosaurs!"
    },
    "Layers of the Earth": { // Grade 8
        overview: "The Earth is divided into four distinct layers.",
        content: "From outside in: Crust, Mantle, Outer Core, and Inner Core.",
        steps: ["Crust: The rocky surface.", "Mantle: Hot semi-solid rock.", "Core: Iron and nickel."],
        tip: "The crust is as thin as the skin of an apple!"
    },
    "Solar System and Space": { // Grade 9
        overview: "The Sun and everything held by its gravity.",
        content: "Includes 8 planets, many moons, and asteroids.",
        steps: ["Identify Terrestrial planets.", "Identify Gas Giants.", "Understand gravity's role."],
        tip: "Jupiter is so big all other planets could fit inside it twice!"
    },

        // --- MORE CHEMISTRY ---
    "States of Matter": {
        overview: "Matter exists in three primary states: Solid, Liquid, and Gas.",
        content: "The state of matter depends on how fast the molecules are moving and how much energy they have.",
        steps: ["Solid: Fixed shape and volume.", "Liquid: Takes the shape of its container.", "Gas: Fills all available space."],
        tip: "Plasma is actually the 4th state of matter, found in stars and lightning!"
    },
    "Acids and Bases": {
        overview: "Acids and bases are two different types of chemical substances with unique properties.",
        content: "We measure how acidic or basic a substance is using the <b>pH Scale</b> (0 to 14).",
        steps: ["Acids: Sour taste, pH less than 7 (like lemons).", "Bases: Bitter taste, slippery feel, pH over 7 (like soap).", "Neutral: pH of exactly 7 (like pure water)."],
        tip: "Strong acids can dissolve metal, but your stomach uses them to digest food!"
    },

    // --- MORE BIOLOGY ---
    "Photosynthesis": {
        overview: "The process by which plants turn sunlight into food.",
        content: "Plants take in Water, Carbon Dioxide, and Sunlight to produce <b>Glucose</b> (sugar) and Oxygen.",
        steps: ["Chlorophyll captures sunlight in the leaves.", "Water is absorbed through the roots.", "Oxygen is released as a byproduct for us to breathe!"],
        tip: "Without photosynthesis, there would be no oxygen on Earth!"
    },
    "Genetics and DNA": {
        overview: "DNA is the 'instruction manual' for every living thing.",
        content: "Your traits (like eye color) are passed down from your parents through <b>genes</b>.",
        steps: ["DNA is shaped like a twisted ladder (Double Helix).", "Genes are segments of DNA that determine specific traits.", "Chromosomes are the structures that hold your DNA together."],
        tip: "99.9% of DNA is exactly the same in every human being!"
    },

    // --- MORE EARTH SCIENCE ---
    "Plate Tectonics": {
        overview: "The Earth's outer shell is broken into giant pieces called plates.",
        content: "These plates float on the hot mantle and are constantly moving, causing earthquakes and volcanoes.",
        steps: ["Divergent: Plates move apart.", "Convergent: Plates crash into each other.", "Transform: Plates slide past each other."],
        tip: "Mount Everest is still growing because two plates are crashing together underneath it!"
    },
    "Weather and Climate": {
        overview: "Weather is what happens daily; Climate is the long-term pattern.",
        content: "Factors like temperature, humidity, and air pressure determine what it's like outside.",
        steps: ["Understand the atmosphere layers.", "Identify different cloud types (Cumulus, Stratus, etc.).", "Learn how the ocean affects local weather."],
        tip: "Climate is what you expect (Winter), weather is what you get (Snow today)!"
    },

 
    // FALLBACK
 
    "Default": {
        overview: "General subject overview.",
        content: "Please refer to your textbook for the specific diagrams for this chapter.",
        steps: ["Read the notes.", "Review the summary.", "Complete the quiz."],
        tip: "Don't forget to use the 'Explore More' button for deeper research!"
    }
};

function triggerCrawler(topic) {
    // 1. Navigation
    navigateTo('vReader'); 
    const contentBox = document.getElementById('bookContent');
    const titleBox = document.getElementById('readerTitle');

    // 2. Safe Loading State
    let userGrade = "Student";
    try {
        if (typeof userDB !== 'undefined' && typeof u !== 'undefined') {
            userGrade = "Grade " + userDB[u].grade;
        }
    } catch (e) { console.warn("User context not found."); }

    contentBox.innerHTML = `
        <div style="text-align:center; padding:50px;">
            <div class="loader"></div>
            <p>AI Crawler is fetching ${userGrade} content for: <b>${topic}</b>...</p>
        </div>
    `;

    // 3. FIX: Enhanced Case-Insensitive Lookup
    // We check the exact key, then a case-insensitive key, then fallback
    const lessonKey = Object.keys(lessonRepo).find(key => key.toLowerCase() === topic.toLowerCase());
    const data = lessonRepo[lessonKey] || lessonRepo["Default"];

    setTimeout(() => {
        if (titleBox) titleBox.innerText = topic;

        contentBox.innerHTML = `
            <div class="lesson-container" style="animation: fadeIn 0.5s ease;">
                <h2 style="color: var(--accent); margin-bottom: 5px;">${topic}</h2>
                <p style="font-size: 0.8rem; opacity: 0.6; margin-bottom: 20px;">AI-Generated Lesson • +50 PTS Available</p>
                <hr style="border: 0.5px solid var(--border); margin-bottom: 20px;">

                <div class="lesson-step">
                    <h4><i class="fas fa-book-open"></i> Concept Introduction</h4>
                    <p>${data.overview}</p>
                </div>

                <div class="lesson-step" style="background: rgba(255,255,255,0.03); padding: 15px; border-radius: 12px; border-left: 4px solid var(--accent);">
                    <h4><i class="fas fa-lightbulb"></i> The Core Rule</h4>
                    <p>${data.content}</p>
                    <div class="math-display" style="background: #000; padding: 15px; border-radius: 8px; margin-top: 10px; font-family: 'Courier New', monospace; color: #00ff88; text-align: center; border: 1px solid #333;">
                        ${data.tip}
                    </div>
                </div>

                <div class="lesson-step">
                    <h4><i class="fas fa-list-ol"></i> Step-by-Step Guide</h4>
                    <ul style="padding-left: 20px; line-height: 1.8;">
                        ${data.steps.map(step => `<li style="margin-bottom: 8px;">${step}</li>`).join('')}
                    </ul>
                </div>

                <button class="btn-secondary" 
                    style="padding: 12px 20px; border-radius: 50px; background: rgba(255,255,255,0.1); color: white; border: 1px solid rgba(255,255,255,0.2); font-weight: 600; cursor: pointer; transition: 0.3s;"
                    onmouseover="this.style.backgroundColor='rgba(255,255,255,0.2)'"
                    onmouseout="this.style.backgroundColor='rgba(255,255,255,0.1)'"
                    data-action="exploreMore" data-explore-topic="${topic.replace(/'/g, "\\'")}">
                    🔍 EXPLORE MORE
                </button>

                <div style="text-align:center; padding: 40px 20px;">
                    <button class="btn-primary" 
                            style="max-width: 300px; padding: 15px; border-radius: 50px; background: var(--accent); color: #000; font-weight: 800; cursor: pointer; border: none;"
                            data-finish-lesson="${topic.replace(/'/g, "\\'")}">
                        FINISH LESSON & CLAIM 50 PTS
                    </button>
                </div>
            </div>
        `;
    }, 1200);
}

function exploreMore(topic) {
    // This creates a safe search URL for educational sites
    const searchQuery = encodeURIComponent(topic + " educational guide for students");
    const url = `https://www.youtube.com/results?search_query=${searchQuery}`;
    
    // Opens the information in a new tab so they don't lose their place in your app
    window.open(url, '_blank');
}

// Helper function to handle the reward
function finishLesson(topicName) {
    addPoints(50, `Completed ${topicName || 'Lesson'}`);
    showAlert(`Lesson Complete! You earned 50 Study Points.`);
    navigateTo('vEbooks');
    if (topicName && typeof QuizAI !== 'undefined' && typeof QuizAI.generate === 'function') {
        QuizAI.generate(topicName);
    }
}

// Duplicate openSubject removed: original definition preserved earlier in the file.


// 6. SHOP & VISUALS
 
function handleItemAction(itemId, cost) {
    let user = userDB[u];
    if (!user.inventory) user.inventory = [];
    
    if (user.inventory.includes(itemId)) {
        user.equippedItem = (user.equippedItem === itemId) ? null : itemId;
    } else if (Number(user.points) >= Number(cost)) {
        user.points -= cost;
        user.inventory.push(itemId);
        user.equippedItem = itemId;
        if (typeof triggerPointAnim === 'function') triggerPointAnim(cost, true);
    } else return showAlert("Not enough points!");
    
    saveAndSync();
    updateVisuals(); 
    refreshShopButtons();
}

function handleGlowAction(glowId, cost) {
    let user = userDB[u];
    if (!user) return;
    if (!user.inventory) user.inventory = [];
    
    if (user.inventory.includes(glowId)) {
        user.activeGlow = (user.activeGlow === glowId) ? null : glowId;
    } else if (Number(user.points) >= Number(cost)) {
        user.points -= cost;
        user.inventory.push(glowId);
        user.activeGlow = glowId;
        if (typeof triggerPointAnim === 'function') triggerPointAnim(cost, true);
    } else return showAlert("Not enough points!");
    
    saveAndSync();
    updateVisuals(); 
    refreshShopButtons();
}

function handleThemeAction(themeId, cost) {
    let user = userDB[u];
    if (!user.unlockedThemes) user.unlockedThemes = [];
    
    if (user.unlockedThemes.includes(themeId)) {
        user.activeTheme = (user.activeTheme === themeId) ? 'default' : themeId;
    } else if (Number(user.points) >= Number(cost)) {
        user.points -= cost;
        user.unlockedThemes.push(themeId);
        user.activeTheme = themeId;
        if (typeof triggerPointAnim === 'function') triggerPointAnim(cost, true);
    } else return showAlert("Not enough points!");
    
    saveAndSync();
    updateVisuals(); 
    refreshShopButtons();
}

function refreshShopButtons() {
    const user = userDB[u];
    if (!user) return;
    if (!user.inventory) user.inventory = [];
    if (!user.unlockedThemes) user.unlockedThemes = [];

    // FIXED: Swapped 'crown' out for 'custom_cursor' to avoid broken DOM searches
    ['custom_cursor', 'gold_glow', 'blue_glow', 'red_theme'].forEach(id => {
        const btn = document.getElementById(`btn-${id}`);
        if (!btn) return;
        
        const owned = user.inventory.includes(id) || user.unlockedThemes.includes(id);
        if (!owned) {
            btn.innerText = "Buy";
        } else {
            const isEquipped = (user.equippedItem === id || user.activeTheme === id || user.activeGlow === id);
            btn.innerText = isEquipped ? "Unequip" : "Equip";
        }
    });
}

function updateVisuals() {
    const user = userDB[u];
    if (!user) return;

    // --- 1. Custom Cursor Engine Layer ---
    if (user.equippedItem === 'custom_cursor') {
        document.body.classList.add('use-custom-cursor');
    } else {
        document.body.classList.remove('use-custom-cursor');
    }

    // --- 2. Dynamic Theme & Golden Aura Background System ---
    const root = document.documentElement;
    
    if (user.activeTheme === 'red_theme') {
        // Red Theme baseline structural layout
        root.style.setProperty('--primary', '#ff4d4d');
        root.style.setProperty('--bg-grad', 'linear-gradient(180deg, #4d0000 0%, #000 100%)');
        document.body.classList.add('theme-red');
    } else {
        // Clear Red Theme baseline flags safely
        document.body.classList.remove('theme-red');
        root.style.setProperty('--primary', '#00d4ff');

        if (user.activeGlow === 'gold_glow') {
            // Apply golden gradient smoothly when active without clashing into Red Void
            root.style.setProperty('--bg-grad', 'linear-gradient(135deg, #1a252f 0%, #2c3e50 50%, #d4ac0d 100%)');
        } else {
            // Fallback default setup configuration base layout 
            root.style.setProperty('--bg-grad', 'linear-gradient(180deg, #1a1a2e 0%, #000 100%)');
        }
    }

    // --- 3. Dynamic Aura Cursor Blur Ring Elements Injection ---
    let trail = document.getElementById('cw-gold-aura-trail');
    if (user.activeGlow === 'gold_glow') {
        if (!trail) {
            trail = document.createElement('div');
            trail.id = 'cw-gold-aura-trail';
            document.body.appendChild(trail);
        }
    } else if (trail) {
        trail.remove();
    }

    // --- 4. Retrofit Core Character Avatars updates ---
    const avatar = document.getElementById('avatarDisplay');
    if (avatar) {
        avatar.classList.remove('gold_glow-active', 'blue_glow-active');
        if (user.activeGlow) avatar.classList.add(`${user.activeGlow}-active`);
    }
}

function updateAvatarGender() {
    const charBase = document.getElementById('charBase');
    if (charBase && userDB[u]) charBase.src = (userDB[u].gender === 'female') ? "woman.png" : "man.png";
}

// Deprecated or combined into updateVisuals tracking logic blocks smoothly
function applyTheme(themeId) {
    if (userDB[u]) {
        userDB[u].activeTheme = themeId;
        updateVisuals();
    }
}

// ATTACH GLOBAL MOUSETRACKING COORD HOOK FOR ACTIVE GLOW TRAILS
document.addEventListener('mousemove', (e) => {
    const trail = document.getElementById('cw-gold-aura-trail');
    if (trail) {
        trail.style.left = (e.clientX - 20) + 'px';
        trail.style.top = (e.clientY - 20) + 'px';
    }
});

 
// 7. UTILS & HELPERS
 
let isClaiming = false; // New guard variable

function handleDailyClaim() {
    if (isClaiming) return;
    
    const user = userDB[u];
    if (!user) return;
    
    const now = Date.now();
    if (now - (user.lastClaim || 0) >= 86400000) {
        isClaiming = true;
        user.lastClaim = now;
        
        // Use the new function we just made
        addPoints(100, "Daily"); 
        
        saveAndSync();
        setTimeout(() => { isClaiming = false; }, 1000);
    } else {
        showAlert("Your next reward isn't ready yet!");
    }
}

function updateDailyUI() {
    // 1. EXIT EARLY if user is not logged in
    if (!u || !userDB[u]) return; 

    // 2. CHECK if elements exist before doing anything
    const btn = document.getElementById('dailyBtn');
    const timerDisplay = document.getElementById('claimTimer');
    
    if (!btn || !timerDisplay) return; // This stops the error!

    const user = userDB[u];
    const last = user.lastClaim || 0;
    const timeLeft = 86400000 - (Date.now() - last);

    if (timeLeft <= 0) {
        btn.disabled = false; 
        btn.style.opacity = "1";
        timerDisplay.innerText = "Ready!";
    } else {
        btn.disabled = true;
        btn.style.opacity = "0.5";
        const h = Math.floor(timeLeft / 3600000);
        const m = Math.floor((timeLeft % 3600000) / 60000);
        const s = Math.floor((timeLeft % 60000) / 1000);
        timerDisplay.innerText = `${h}h ${m}m ${s}s`;
    }
}

function showAlert(message) {
    const alertBox = document.getElementById('custom-alert');
    const content = document.getElementById('modal-content');
    
    if (alertBox && content) {
        content.innerHTML = message;
        alertBox.classList.remove('hidden'); // This removes the display:none
    }
}

function hideAlert() { document.getElementById('custom-alert').classList.add('hidden'); }

function confirmLogout(isConfirmed) {
    const modal = document.getElementById('logoutModal');
    if (isConfirmed) {
        u = null;
        sessionStorage.removeItem('ActiveSession');
        // Optional: clear specific points if you want a fresh start
        // localStorage.removeItem('userPoints'); 
        location.reload(); 
    } else {
        if (modal) modal.classList.add('hidden');
    }
}

function openLogoutDialog() { 
    const modal = document.getElementById('logoutModal');
    if (modal) modal.classList.remove('hidden'); 
}

function closeLogoutModal() {
    const modal = document.getElementById('logoutModal');
    if (modal) modal.classList.add('hidden');
}

function calculateRank(pts) { return pts >= 1200 ? "Master Scholar" : (pts >= 600 ? "Elite Student" : "Novice"); }

 
// 9. SLIDER LOGIC (FIXED)

function manualSlide(index) {
    slideIndex = index;
    const track = document.getElementById('sliderTrack');
    const dots = document.querySelectorAll('.slider-dot'); // Targets your dot elements
    
    if (track) {
        track.style.transform = `translateX(-${index * 100}%)`;

        const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

        // 2. Use it inside an async function
        async function runTimer() {

        // Wait for 6000 milliseconds (6 seconds)
        await delay(4000); 
        track.style.transform = `translateX(-${index * 200}%)`;

        }
        runTimer();
    } else {
        track.style.transform = `translateX(-${index * 0}%)`;
    }

    if (dots.length > 0) {
        dots.forEach((dot, i) => {
            dot.classList.toggle('active', i === index);
        });
    } else {
        if (dots.length === 3) {
            dots[2].classList.add('active');
        }
    }

}


// Auto-slide interval (stored in a variable so it stays consistent)

 
// 8. INITIALIZATION
 

 
// 1. SEARCH LOGIC (Defined)
 
function searchTopics() {
    const input = document.getElementById('ebookSearch');
    if (!input) return;
    
    const filter = input.value.toLowerCase();
    const userGrade = userDB[u].grade;
    
    // Collect all topics across all subjects for the user's grade
    let allGradeTopics = [];
    Object.keys(knowledgeBase).forEach(subject => {
        if (knowledgeBase[subject][userGrade]) {
            allGradeTopics = allGradeTopics.concat(knowledgeBase[subject][userGrade]);
        }
    });

    // Filter based on search input
    const filtered = allGradeTopics.filter(topic => 
        topic.toLowerCase().includes(filter)
    );

    // Update the UI
    document.getElementById('subjectLibrary').classList.add('hidden');
    document.getElementById('topicView').classList.remove('hidden');
    document.getElementById('activeSubjectDisplay').innerText = `Search Results: "${filter}"`;
    
    renderTopics(filtered);
}

function resetLibrary() {
    const lib = document.getElementById('subjectLibrary');
    const topicView = document.getElementById('topicView');
    
    // This ensures that when you return, you see the Math/Physics buttons
    if (lib) lib.classList.remove('hidden'); 
    if (topicView) topicView.classList.add('hidden');
}

// Run this function whenever you switch to a subject view
function applyShopStyle(btn) {
    if (btn.innerText.trim() === "LEARN") {
        // Reset defaults
        btn.style.all = "unset";
        
        // Base Shop Item Style
        btn.style.display = "inline-block";
        btn.style.cursor = "pointer";
        btn.style.padding = "8px 20px";
        btn.style.borderRadius = "12px";
        btn.style.fontSize = "12px";
        btn.style.fontWeight = "800";
        btn.style.textAlign = "center";
        btn.style.textTransform = "uppercase";
        btn.style.transition = "all 0.3s ease";
        
        // The "Glass" Look
        btn.style.backgroundColor = "rgba(255, 255, 255, 0.05)";
        btn.style.color = "#ffffff";
        btn.style.border = "1px solid rgba(255, 255, 255, 0.2)";
        btn.style.backdropFilter = "blur(5px)";
        
        // Animation & Hover Logic
        btn.onmouseover = () => {
            btn.style.backgroundColor = "#ffffff";
            btn.style.color = "#000000";
            btn.style.transform = "translateY(-2px)";
            btn.style.boxShadow = "0 5px 15px rgba(255, 255, 255, 0.3)";
            btn.style.borderColor = "#ffffff";
        };
        
        btn.onmouseout = () => {
            btn.style.backgroundColor = "rgba(255, 255, 255, 0.05)";
            btn.style.color = "#ffffff";
            btn.style.transform = "translateY(0)";
            btn.style.boxShadow = "none";
            btn.style.borderColor = "rgba(255, 255, 255, 0.2)";
        };
    }
}

// Unified function for Style + Logic
// Improved Setup with Clean String Logic
function setupAllLearnButtons() {
    // Disabled: avoid overriding existing button styles and handlers.
    // Delegated handlers using data-* attributes already handle LEARN buttons.
    return;
}

// Watch for when you open the Math/Physics folders
// 8. INITIALIZATION
// Initialization
window.onload = () => { if (u) syncAppState(); };

// Safe Background Loop (Runs every 1 second)
setInterval(() => {
    // 1. Only run if a user is logged in
    if (u && userDB[u]) {
        
        // 2. Safe Daily UI Update
        const btn = document.getElementById('dailyBtn');
        const timer = document.getElementById('claimTimer');
        
        if (btn && timer) {
            const last = userDB[u].lastClaim || 0;
            const remaining = 86400000 - (Date.now() - last);

            if (remaining <= 0) {
                btn.disabled = false;
                btn.style.opacity = "1";
                timer.innerText = "Ready!";
            } else {
                btn.disabled = true;
                btn.style.opacity = "0.5";
                const h = Math.floor(remaining / 3600000);
                const m = Math.floor((remaining % 3600000) / 60000);
                const s = Math.floor((remaining % 60000) / 1000);
                timer.innerText = `${h}h ${m}m ${s}s`;
            }
        }

        // 3. Safe Points Update
        syncPointsUI();
    }
}, 1000);

// Home screen slider logic
setInterval(() => { 
    slideIndex = (slideIndex === 0) ? 1 : 0; 
    manualSlide(slideIndex); 
}, 6000);
// 2. The Watcher (MutationObserver)
// This ensures that when you open Grade 7/8/9 menus, the buttons work instantly

// Keep the observer, but make it call the plural function safely
// Previously this observer auto-applied inline styles/handlers. With delegated
// data-* handlers we don't need to mutate button styles at runtime — keep the
// observer as a no-op to avoid interfering with user-defined styles.
const finalObserver = new MutationObserver(() => {
    // Intentionally empty: delegation handles dynamic elements.
});

// Only start observing if the body exists
if (document.body) {
    finalObserver.observe(document.body, { childList: true, subtree: true });
}

// --- AI QUIZ GENERATOR ENGINE ---

const QuizAI = {
    isProcessing: false,

    generate: function(topic) {
        navigateTo('vQuiz'); 

        const container = document.getElementById('quizContainer');
        if (!container) return;

        container.innerHTML = `<div class="ai-loading">Initializing Neural Link for ${topic}...</div>`;

        const data = lessonRepo[topic] || { overview: "General Study", steps: ["Follow instructions"], tip: "Stay focused" };
        
        // True/False Logic Generation
        const questions = [
            {
                type: "Fact Check",
                q: `TRUE OR FALSE: ${topic} primarily focuses on ${data.overview}.`,
                options: ["TRUE", "FALSE"],
                correct: "TRUE" 
            },
            {
                type: "Logic Check",
                q: `TRUE OR FALSE: The recommended expert tip for this lesson is "${data.tip}".`,
                options: ["TRUE", "FALSE"],
                correct: "TRUE"
            }
        ];

        // FIXED: Using an arrow function here so 'this' refers to QuizAI
        setTimeout(() => {
            this.render(questions, topic);
        }, 1000);
    },

    render: function(questions, topic) {
        const container = document.getElementById('quizContainer');
        container.innerHTML = `<div class="ai-header">AI ANALYSIS: ${topic}</div>`;

        questions.forEach((item, index) => {
            const card = document.createElement('div');
            card.className = 'ai-quiz-card';
            card.innerHTML = `
                <p class="ai-q-type">${item.type}</p>
                <h3>${item.q}</h3>
                <div class="quiz-options" id="q-group-${index}"></div>
            `;
            
            const btnGroup = card.querySelector('.quiz-options');
            btnGroup.style.display = "flex";
            btnGroup.style.gap = "10px";

            item.options.forEach(opt => {
                const btn = document.createElement('button');
                btn.className = 'ai-opt-btn';
                btn.innerText = opt;
                btn.style.flex = "1";
                
                btn.onclick = () => this.verify(btn, opt, item.correct, btnGroup);
                btnGroup.appendChild(btn);
            });
            container.appendChild(card);
        });
    },

    verify: function(btn, selected, correct, group) {
        if (selected === correct) {
            btn.classList.add('correct');
            // Disable all buttons in this group after a correct answer
            group.querySelectorAll('button').forEach(b => b.disabled = true);
            addPoints(20, "AI Quiz Pass");
            if (typeof showAlert === 'function') showAlert("AI Analysis Correct! +20 PTS");
        } else {
            btn.classList.add('wrong');
            btn.disabled = true; // Only disable the wrong one so they can try again
            if (typeof showAlert === 'function') showAlert("AI Analysis Error. Try again.");
        }
    },

    shuffle: function(array) {
        return array.sort(() => Math.random() - 0.5);
    }
};

// Function to save a video link
// Function to handle the Input Box and Save
function processAndSaveVideo() {
    const urlInput = document.getElementById('videoUrlInput');
    const titleInput = document.getElementById('videoTitleInput');
    
    let url = urlInput.value.trim();
    let title = titleInput.value.trim();

    if (!url || !title) {
        showAlert("Please enter both a link and a title!");
        return;
    }

    let embedUrl = "";
    
    // Convert logic for YouTube variants
    if (url.includes("youtube.com/watch?v=")) {
        embedUrl = url.replace("watch?v=", "embed/");
    } else if (url.includes("youtu.be/")) {
        embedUrl = url.replace("youtu.be/", "youtube.com/embed/");
    } else if (url.includes("youtube.com/shorts/")) {
        embedUrl = url.replace("shorts/", "embed/");
    } else {
        embedUrl = url; // Fallback for other providers
    }

    let library = JSON.parse(localStorage.getItem('NGS_LIBRARY')) || [];
    
    const newVideo = {
        id: Date.now(),
        title: title,
        embedUrl: embedUrl,
        originalUrl: url,
        date: new Date().toLocaleDateString()
    };

    library.unshift(newVideo);
    localStorage.setItem('NGS_LIBRARY', JSON.stringify(library));

    urlInput.value = "";
    titleInput.value = "";
    showAlert("Video Saved to Online Library!");
    renderLibrary();
}

// Function to display the library with embedded players
function renderLibrary() {
    const container = document.getElementById('savedContainer');
    const library = JSON.parse(localStorage.getItem('NGS_LIBRARY')) || [];

    if (library.length === 0) {
        container.innerHTML = `<p style="text-align:center; opacity:0.5; margin-top:50px;">Your library is empty.</p>`;
        return;
    }

    container.innerHTML = library.map(item => `
        <div class="ai-quiz-card" style="margin-bottom: 25px; padding: 15px; border-left: 4px solid var(--accent);">
            <h3 style="margin-bottom: 10px;">${item.title}</h3>
            
            <div style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; border-radius: 8px; background: #000; margin-bottom: 15px;">
                <iframe 
                    style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: 0;"
                    src="${item.embedUrl}" 
                    frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen>
                </iframe>
            </div>

            <div style="display:flex; flex-direction:column; gap:10px;">
                <a href="${item.originalUrl}" target="_blank" class="ai-opt-btn" 
                   style="text-align:center; background:rgba(255,255,255,0.1); font-size:0.8rem; text-decoration:none; color:white;">
                   <i class="fas fa-external-link-alt"></i> Video not loading? Open in new tab
                </a>
                
                <div style="display:flex; justify-content:space-between; align-items:center; margin-top:10px;">
                    <span style="font-size:0.7rem; opacity:0.5;">Saved ${item.date}</span>
                    <button data-action="deleteVideo" data-video-id="${item.id}" style="background:none; border:none; color:#ff4d4d; cursor:pointer;">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

// Function to delete
function deleteVideo(id) {
    let library = JSON.parse(localStorage.getItem('NGS_LIBRARY')) || [];
    library = library.filter(video => video.id !== id);
    localStorage.setItem('NGS_LIBRARY', JSON.stringify(library));
    renderLibrary();
}

// Update your navigation trigger
function viewSaved() {
    navigateTo('vSaved');
    renderLibrary();
}

// 1. DATA REPOSITORY FOR MULTI-SUBJECT EXERCISES
// 1. ADVANCED STEP-BY-STEP EXERCISE DATA REPOSITORY
// Master Grade-Stratified Multi-Subject Exercise Database
const exerciseDatabase = {
    "7": {
        "Math": {
            "Common Exercises": [
                {
                    id: "g7_m_com_1",
                    q: "Simplify the algebraic expression by combining like terms: 3x + 5y - x + 2y",
                    sol: "<b>Step 1: Group the like terms</b><br>Gather the terms with 'x' and the terms with 'y' together:<br>(3x - x) + (5y + 2y)<br><br><b>Step 2: Combine coefficients</b><br>Subtract the x coefficients: 3 - 1 = 2 → 2x<br>Add the y coefficients: 5 + 2 = 7 → 7y<br><br><b>Step 3: Write final expression</b><br>Combine the results: <b>2x + 7y</b>",
                    questions: ["How do you identify if two algebraic terms are 'like terms'?", "Show the math step you used to simplify the 'x' terms."]
                },
                {
                    id: "g7_m_com_2",
                    q: "Find the value of x in the following linear equation: 4x - 7 = 13",
                    sol: "<b>Step 1: Eliminate the constant offset</b><br>Add 7 to both sides of the equation to isolate the variable term on the left side:<br>4x - 7 + 7 = 13 + 7<br>4x = 20<br><br><b>Step 2: Isolate the variable x</b><br>Divide both sides by 4:<br>4x / 4 = 20 / 4<br><b>x = 5</b>",
                    questions: ["What operation inverse did you apply to clear the negative constant 7?", "How do you plug your result back in to check if your calculation is completely valid?"]
                }
            ],
            "Hard Exercises": [
                {
                    id: "g7_m_hard_1",
                    q: "Solve for the variable x: 2(x - 4) + 3 = 11",
                    sol: "<b>Step 1: Distribute the 2</b><br>Multiply 2 into the parentheses: 2x - 8 + 3 = 11<br><br><b>Step 2: Simplify constants on the left side</b><br>Combine -8 and +3: 2x - 5 = 11<br><br><b>Step 3: Isolate the variable term</b><br>Add 5 to both sides: 2x = 11 + 5 → 2x = 16<br><br><b>Step 4: Solve for x</b><br>Divide both sides by 2: x = 16 / 2 → <b>x = 8</b>",
                    questions: ["Explain what the distributive property did to the expression 2(x - 4).", "Detail the step used to clear the constant -5 from the left side."]
                },
                {
                    id: "g7_m_hard_2",
                    q: "The perimeter of a rectangular garden is 36 meters. If the length is 2 meters more than twice its width, find the dimensions of the garden.",
                    sol: "<b>Step 1: Define variables</b><br>Let width = w. Then, length (l) = 2w + 2.<br><br><b>Step 2: Set up the perimeter equation</b><br>Perimeter = 2(length + width) → 2((2w + 2) + w) = 36<br>2(3w + 2) = 36 → 6w + 4 = 36<br><br><b>Step 3: Solve for width (w)</b><br>6w = 36 - 4 → 6w = 32 → w = 32 / 6 = 5.33 meters.<br><br><b>Step 4: Calculate length</b><br>l = 2(5.33) + 2 = 12.66 meters.<br><br><b>Answer: Width = 5.33m, Length = 12.66m</b>",
                    questions: ["Show the algebraic expression modeling how the length depends on the width variable.", "State the formula used to represent geometric perimeters."]
                }
            ]
        },
        "Physics": {
            "Common Exercises": [
                {
                    id: "g7_p_com_1",
                    q: "An object travels a uniform distance of 60 meters in 12 seconds. Calculate its speed.",
                    sol: "<b>Step 1: State the formula</b><br>Speed (v) = Distance (d) / Time (t)<br><br><b>Step 2: Plug in values</b><br>v = 60 m / 12 s<br><br><b>Step 3: Calculate unit output</b><br>v = <b>5 m/s</b>",
                    questions: ["Write down the basic formula used to find speed.", "What would happen to the speed value if the time taken was doubled?"]
                },
                {
                    id: "g7_p_com_2",
                    q: "A toy car travels at a constant speed of 4 m/s for 15 seconds. Find the total distance it covered.",
                    sol: "<b>Step 1: Rearrange the speed formula</b><br>Since Speed = Distance / Time, rearranging for distance gives:<br>Distance (d) = Speed (v) × Time (t)<br><br><b>Step 2: Substitute values</b><br>d = 4 m/s × 15 s<br><br><b>Step 3: Compute final product</b><br>d = <b>60 meters</b>",
                    questions: ["State how you rearrange the fundamental speed formula to solve for total distance.", "What standard units of tracking measure distance in the metric scale system?"]
                }
            ],
            "Hard Exercises": []
        },
        "Chemistry": {
            "Common Exercises": [
                {
                    id: "g7_c_com_1",
                    q: "Identify whether melting an ice cube into liquid water is a physical change or a chemical change.",
                    sol: "<b>Step 1: Analyze the substance identity</b><br>Before melting, the substance is H₂O (solid ice). After melting, it is still H₂O (liquid water). No new substance is formed.<br><br><b>Step 2: Define change properties</b><br>Since the chemical composition remains identical and only the state of matter altered, this is a physical change.<br><br><b>Answer: Physical Change</b>",
                    questions: ["What is the primary factor that distinguishes a physical change from a chemical change?", "Name another everyday example of a physical change."]
                },
                {
                    id: "g7_c_com_2",
                    q: "Classify baking a cake or burning a piece of wood. Is it a physical change or a chemical change?",
                    sol: "<b>Step 1: Analyze structural alterations</b><br>When wood burns, ash, smoke, and entirely new gaseous molecules form that cannot be easily reversed back into original wood fiber.<br><br><b>Step 2: Define mutation criteria</b><br>Because a brand-new substance is generated with completely fresh properties, this is categorized as a chemical change.<br><br><b>Answer: Chemical Change</b>",
                    questions: ["List two visual observations that indicate a chemical reaction has taken place.", "Why is a chemical change usually much harder to reverse than a physical change?"]
                }
            ],
            "Hard Exercises": []
        },
        "Biology": {
            "Common Exercises": [
                { id: "g7_b_com_1", q: "What basic structural and functional unit makes up all living organisms?", ans: "Cell" },
                { id: "g7_b_com_2", q: "What tool do scientists use to magnify tiny biological structures like animal and plant cells so they can be seen by the human eye?", ans: "Microscope" }
            ],
            "Hard Exercises": []
        },
        "Earth Science": {
            "Common Exercises": [
                { id: "g7_e_com_1", q: "Name the layer of the Earth's atmosphere where all human weather events take place.", ans: "Troposphere" },
                { id: "g7_e_com_2", q: "What are the names of the three major family categories that scientists use to classify rocks based on how they form?", ans: "Igneous, Sedimentary, and Metamorphic" }
            ],
            "Hard Exercises": []
        }
    },
    "8": {
        "Math": {
            "Common Exercises": [
                {
                    id: "g8_m_com_1",
                    q: "Find the length of the hypotenuse of a right-angled triangle if the two legs measure 6 cm and 8 cm.",
                    sol: "<b>Step 1: State the Pythagorean Theorem</b><br>a² + b² = c² (where c is the hypotenuse)<br><br><b>Step 2: Substitute leg measurements</b><br>6² + 8² = c²<br>36 + 64 = c²<br>100 = c²<br><br><b>Step 3: Take the square root</b><br>c = √100 → <b>c = 10 cm</b>",
                    questions: ["State the algebraic formula for the Pythagorean theorem.", "Why must this theorem only be applied to right-angled triangles?"]
                },
                {
                    id: "g8_m_com_2",
                    q: "Calculate the area of a circle that has a radius of 7 cm. (Use π = 22/7)",
                    sol: "<b>Step 1: Recall the circle area formula</b><br>Area (A) = π × r²<br><br><b>Step 2: Substitute values into expression</b><br>A = (22/7) × 7 × 7<br><br><b>Step 3: Simplify and cancel values</b><br>One 7 cancels out: A = 22 × 7 = <b>154 cm²</b>",
                    questions: ["Write down the area formula for any standard circle geometry shape.", "What measurement modification occurs if you are given the diameter instead of the radius?"]
                }
            ],
            "Hard Exercises": [
                {
                    id: "g8_m_hard_1",
                    q: "A ladder 13 feet long rests against a vertical wall. If the bottom of the ladder is 5 feet away from the base of the wall, how high up the wall does the ladder reach?",
                    sol: "<b>Step 1: Identify your right-triangle sides</b><br>The ladder acts as the hypotenuse (c = 13). The ground distance is one leg (a = 5). The wall height is the unknown leg (b).<br><br><b>Step 2: Apply the Pythagorean Theorem</b><br>a² + b² = c² → 5² + b² = 13²<br>25 + b² = 169<br><br><b>Step 3: Isolate and solve for b</b><br>b² = 169 - 25 → b² = 144<br>b = √144 → <b>b = 12 feet</b>",
                    questions: ["Which part of the physical setup represents the hypotenuse side?", "Show the subtraction step used to isolate the unknown vertical height value."]
                }
            ]
        },
        "Physics": {
            "Common Exercises": [
                {
                    id: "g8_p_com_1",
                    q: "Calculate the force required to accelerate a 5 kg mass object at a rate of 3 m/s².",
                    sol: "<b>Step 1: State Newton's Second Law</b><br>Force (F) = Mass (m) × Acceleration (a)<br><br><b>Step 2: Substitute parameters</b><br>F = 5 kg × 3 m/s²<br><br><b>Step 3: Calculate product</b><br>F = <b>15 N</b> (Newtons)",
                    questions: ["What physics law correlates mass, acceleration, and net force?", "What unit of measurement is used to represent force profiles?"]
                },
                {
                    id: "g8_p_com_2",
                    q: "An object experiences a net pressure of 50 Pascals over a contact surface area of 2 square meters. Find the total perpendicular force applied.",
                    sol: "<b>Step 1: Recall the pressure calculation formula</b><br>Pressure (P) = Force (F) / Area (A). Rearranging to isolate Force gives: Force = Pressure × Area.<br><br><b>Step 2: Plug in given values</b><br>F = 50 Pa × 2 m²<br><br><b>Step 3: Compute final value</b><br>F = <b>100 N</b>",
                    questions: ["State the physics expression that models pressure metrics over a fixed face.", "What is the equivalent basic metric combination that makes up 1 Pascal unit?"]
                }
            ],
            "Hard Exercises": [
                {
                    id: "g8_p_hard_1",
                    q: "An anchor weighing 200 Newtons is dropped into the ocean. If it displaces 0.01 cubic meters of water, calculate the buoyant force acting on it. (Density of water = 1000 kg/m³, g = 10 m/s²)",
                    sol: "<b>Step 1: State Archimedes' Principle</b><br>Buoyant Force (Fb) = Density of fluid (ρ) × Volume displaced (V) × gravity (g)<br><br><b>Step 2: Substitute parameters</b><br>Fb = 1000 kg/m³ × 0.01 m³ × 10 m/s²<br><br><b>Step 3: Compute final value</b><br>Fb = <b>100 N</b>",
                    questions: ["Whose scientific law helps determine upward buoyant forces in fluid physics?", "Will the anchor float or sink? Justify your claim by comparing the force parameters."]
                }
            ]
        },
        "Chemistry": {
            "Common Exercises": [
                {
                    id: "g8_c_com_1",
                    q: "Determine the total number of protons, neutrons, and electrons inside a neutral Carbon atom (Atomic Number = 6, Mass Number = 12).",
                    sol: "<b>Step 1: Find Protons</b><br>Protons = Atomic Number = 6.<br><br><b>Step 2: Find Electrons</b><br>In a neutral atom, Electrons = Protons = 6.<br><br><b>Step 3: Calculate Neutrons</b><br>Neutrons = Mass Number - Atomic Number = 12 - 6 = 6.<br><br><b>Answer: 6 Protons, 6 Neutrons, 6 Electrons</b>",
                    questions: ["How do you determine the electron count of an atom if it is electrically neutral?", "State the mathematical equation used to calculate structural neutron counts."]
                },
                {
                    id: "g8_c_com_2",
                    q: "Identify the element family type or group name for the highly reactive elements found in Group 1 of the Periodic Table, such as Sodium (Na) and Potassium (K).",
                    sol: "<b>Step 1: Locate column layout configurations</b><br>Group 1 elements are placed on the leftmost column of the chart block (excluding Hydrogen).<br><br><b>Step 2: Match family definitions</b><br>These elements possess exactly 1 valence electron, are soft metals, react aggressively with water, and belong to the Alkali Metals family.<br><br><b>Answer: Alkali Metals</b>",
                    questions: ["Why do elements in the same vertical column of the periodic table share very similar chemical behaviors?", "How many valence electrons do Alkali metals have in their outer shell?"]
                }
            ],
            "Hard Exercises": []
        },
        "Biology": {
            "Common Exercises": [
                { id: "g8_b_com_1", q: "What organ system is primarily responsible for filtering waste products out of human blood?", ans: "Excretory System" },
                { id: "g8_b_com_2", q: "What type of blood vessels carry blood away from the heart to the rest of the body tissue?", ans: "Arteries" }
            ],
            "Hard Exercises": []
        },
        "Earth Science": {
            "Common Exercises": [
                { id: "g8_e_com_1", q: "What geological theory explains the physical moving mechanics of the Earth's massive crustal plates?", ans: "Plate Tectonics" },
                { id: "g8_e_com_2", q: "What is the name of the point on the Earth's surface directly above where an earthquake begins underground?", ans: "Epicenter" }
            ],
            "Hard Exercises": []
        }
    },
    "9": {
        "Math": {
            "Common Exercises": [
                {
                    id: "g9_m_com_1",
                    q: "Factor completely the algebraic expression: x² - 5x + 6.",
                    sol: "<b>Step 1: Identify targets</b><br>Find two integers that multiply to give +6 and add up to -5.<br><br><b>Step 2: Test factors</b><br>(-2) × (-3) = +6, and (-2) + (-3) = -5. The integers are -2 and -3.<br><br><b>Step 3: Group terms</b><br>x² - 2x - 3x + 6 → x(x - 2) - 3(x - 2)<br><br><b>Step 4: Final Factored Form</b><br>Extract the common binomial: <b>(x - 2)(x - 3)</b>.",
                    questions: ["Which pair of integers multiply to +6 while summing to -5?", "Demonstrate how you factor your split groups by extracting their greatest common factor."]
                },
                {
                    id: "g9_m_com_2",
                    q: "Find the roots of the quadratic equation using the quadratic formula: x² - 4x - 5 = 0",
                    sol: "<b>Step 1: Extract coefficients</b><br>Identify values: a = 1, b = -4, c = -5.<br><br><b>Step 2: Set up the Quadratic Formula</b><br>x = [-b ± √(b² - 4ac)] / 2a<br>x = [4 ± √((-4)² - 4(1)(-5))] / 2(1)<br>x = [4 ± √(16 + 20)] / 2 → x = [4 ± √36] / 2<br><br><b>Step 3: Split into two matching solutions</b><br>x = (4 + 6) / 2 = 10 / 2 = 5<br>x = (4 - 6) / 2 = -2 / 2 = -1<br><br><b>Answer: x = 5 or x = -1</b>",
                    questions: ["State the complete quadratic formula used to solve equations of order 2.", "What does it mean if the discriminant value under the square root evaluates to a negative number?"]
                }
            ],
            "Hard Exercises": [
                {
                    id: "g9_m_hard_1",
                    q: "Find the values of k for which the quadratic equation x² + kx + 9 = 0 possesses identical real roots.",
                    sol: "<b>Step 1: Apply the Discriminant Condition</b><br>For a quadratic equation to have identical (repeated) real roots, its discriminant must equal zero (Δ = 0). The formula is: Δ = b² - 4ac.<br><br><b>Step 2: Substitute known constants</b><br>Here, a = 1, b = k, and c = 9.<br>Δ = k² - 4(1)(9) = k² - 36<br><br><b>Step 3: Solve for parameter k</b><br>Set the equation to zero: k² - 36 = 0<br>k² = 36 → k = ±√36<br><b>k = 6 or k = -6</b>.",
                    questions: ["State the algebraic condition formula necessary for establishing equal real roots.", "Provide a brief conceptual explanation for why a negative parameter value for k remains valid."]
                }
            ]
        },
        "Physics": {
            "Common Exercises": [
                {
                    id: "g9_p_com_1",
                    q: "An object accelerates from rest at a rate of 3 m/s² for 6 seconds. Calculate its final velocity.",
                    sol: "<b>Step 1: Identify initial state variables</b><br>Initial velocity (u) = 0 m/s, Acceleration (a) = 3 m/s², Time (t) = 6 s.<br><br><b>Step 2: Calculate final velocity (v)</b><br>v = u + at<br>v = 0 + (3 m/s² × 6 s) = <b>18 m/s</b>.",
                    questions: ["Identify the specific kinematic equations required to solve for velocity.", "Explain why changing the mass would not affect this kinematics outcome."]
                },
                {
                    id: "g9_p_com_2",
                    q: "An electric appliance is connected to a 220V power outlet source and draws an operating current of 2 Amperes. Calculate its total electrical resistance.",
                    sol: "<b>Step 1: Recall Ohm's Law</b><br>Voltage (V) = Current (I) × Resistance (R). Rearranging for resistance: R = V / I.<br><br><b>Step 2: Substitute values</b><br>R = 220V / 2A<br><br><b>Step 3: Simplify the division parameter</b><br>R = <b>110 Ohms (Ω)</b>",
                    questions: ["State Ohm's physical law equation correlating voltage, electrical current, and system resistance.", "What measurement tracking token changes if voltage scales up while keeping resistance locked?"]
                }
            ],
            "Hard Exercises": [
                {
                    id: "g9_p_hard_1",
                    q: "An object accelerates from rest at a rate of 3 m/s² for 6 seconds. Calculate the total distance covered during this time window.",
                    sol: "<b>Step 1: Identify initial state variables</b><br>From rest means initial velocity (u) = 0 m/s. Acceleration (a) = 3 m/s², Time (t) = 6 s.<br><br><b>Step 2: State the displacement kinematic equation</b><br>s = ut + 0.5at²<br><br><b>Step 3: Substitute and compute</b><br>s = (0 × 6) + 0.5 × 3 × (6)²<br>s = 0 + 0.5 × 3 × 36 → s = 0 + 54<br><b>Answer: Distance = 54 meters</b>.",
                    questions: ["Which specific kinematic equation models displacement when starting acceleration from rest?", "Why doesn't the initial mass weight affect this kinematics outcome?"]
                }
            ]
        },
        "Chemistry": {
            "Common Exercises": [
                {
                    id: "g9_c_com_1",
                    q: "Balance the structural chemical combination equation: H₂ + O₂ → H₂O.",
                    sol: "<b>Step 1: Count initial atoms</b><br>Reactants: H=2, O=2 | Products: H=2, O=1.<br><br><b>Step 2: Balance Oxygen</b><br>Add coefficient 2 to water: H₂ + O₂ → 2H₂O.<br><br><b>Step 3: Balance Hydrogen</b><br>Add coefficient 2 to reactant hydrogen: 2H₂ + O₂ → 2H₂O.<br><br><b>Answer: 2H₂ + O₂ → 2H₂O</b>.",
                    questions: ["What is the exact stoichiometric mole ratio of Hydrogen to Oxygen here?", "Explain the fundamental law of physics that dictates chemical equations must balance."]
                },
                {
                    id: "g9_c_com_2",
                    q: "Balance the following displacement reaction equation: Fe + HCl → FeCl₂ + H₂",
                    sol: "<b>Step 1: Count the initial elements on both sides</b><br>Left: Fe = 1, H = 1, Cl = 1 | Right: Fe = 1, Cl = 2, H = 2<br><br><b>Step 2: Add matching stoichiometric coefficients</b><br>Place a coefficient of 2 in front of HCl to instantly balance both the Hydrogen and Chlorine counts:<br>Fe + 2HCl → FeCl₂ + H₂<br><br><b>Step 3: Run final atom verification inventory</b><br>Reactants: Fe=1, H=2, Cl=2 | Products: Fe=1, Cl=2, H=2. The balances match perfectly.<br><br><b>Answer: Fe + 2HCl → FeCl₂ + H₂</b>",
                    questions: ["What chemical reaction category does this transformation belong to?", "Show how you calculated the balanced hydrogen atom parameters on both sides."]
                }
            ],
            "Hard Exercises": []
        },
        "Biology": {
            "Common Exercises": [
                { id: "g9_b_com_1", q: "Explain the active movement difference during cellular Osmosis vs Active Transport.", ans: "Osmosis is passive flow following gradient thresholds; Active Transport requires ATP energy molecules against gradients." },
                { id: "g9_b_com_2", q: "What is the name of the cell division process that produces four non-identical daughter cells, each containing half the chromosome count of the original parent cell?", ans: "Meiosis" }
            ],
            "Hard Exercises": []
        },
        "Earth Science": {
            "Common Exercises": [
                { id: "g9_e_com_1", q: "Identify what structural plate collision action explicitly generates deep oceanic trench profiles.", ans: "Subduction zones at convergent plate boundaries" },
                { id: "g9_e_com_2", q: "What phenomenon refers to the gradual warming of the Earth's atmosphere caused by gases trapping inflowing solar heat energy close to the planet's surface?", ans: "Greenhouse Effect" }
            ],
            "Hard Exercises": []
        }
    }
};

let activeExerciseSubject = "";

// 2. RUNTIME LOGIC CONTROLLERS
function selectExerciseCategory(subject) {
    activeExerciseSubject = subject;
    document.getElementById('exerciseCategories').classList.add('hidden');
    
    const tiersView = document.getElementById('exerciseTiersView');
    tiersView.classList.remove('hidden');
    document.getElementById('currentExerciseSubject').innerText = `${subject} Exercises`;

    renderExerciseTiers(subject);
}

function backToExerciseCategories() {
    document.getElementById('exerciseTiersView').classList.add('hidden');
    document.getElementById('exerciseCategories').classList.remove('hidden');
}

// (Older duplicate `renderExerciseTiers` removed — the improved version appears later in this file.)

// A simple running view tracker to toggle content without forcing re-renders or double purchases
let activeSolutionVisibility = {};

function renderSingleCard(ex, subject) {
    const isSpecialCategory = (subject === "Biology" || subject === "Earth Science");
    const isUnlocked = userDB[u]?.unlockedExercises?.includes(ex.id) || false;
    const isVisible = activeSolutionVisibility[ex.id] || false;
    
    // Check if this exercise was already answered correctly and saved
    const isCompleted = userDB[u]?.completedExercises?.includes(ex.id) || false;
    
    // Get saved submission texts if completed (to keep answers on screen)
    const savedAnswers = userDB[u]?.savedExerciseSubmissions?.[ex.id] || [];

    return `
        <div class="exercise-item-card" id="card-${ex.id}" style="margin-bottom: 20px; padding: 20px; border-right: ${isCompleted ? '4px solid #2ecc71' : 'none'};">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 15px;">
                <div class="exercise-question-body" style="font-size: 1.05rem; font-weight: 600; margin: 0; line-height: 1.4;">${ex.q}</div>
                ${isCompleted ? `<span style="color: #2ecc71; font-weight: 800; font-size: 1.2rem; margin-left: 10px;" title="Completed">✓</span>` : ''}
            </div>
            
            <div class="exercise-expand-panel">
                
                ${!isSpecialCategory ? `
                    <div id="solve-panel-${ex.id}" class="hidden" style="background: rgba(0,0,0,0.3); padding: 20px; border-radius: 12px; margin-bottom: 15px; border: 1px solid rgba(255,255,255,0.05);">
                        <div style="background: ${isCompleted ? 'rgba(46, 204, 113, 0.1)' : 'rgba(0, 136, 204, 0.1)'}; padding: 12px; border-radius: 6px; border-left: 4px solid ${isCompleted ? '#2ecc71' : 'var(--accent)'}; margin-bottom: 15px;">
                            <strong style="color: ${isCompleted ? '#2ecc71' : 'var(--accent)'}; font-size: 0.8rem; letter-spacing: 1px; display: block; margin-bottom: 4px;">
                                ${isCompleted ? '🔒 ACADEMIC RECORD LOCKED' : '📌 WORKSPACE INSTRUCTIONS'}
                            </strong>
                            <span style="font-size: 0.75rem; opacity: 0.8; line-height: 1.4;">
                                ${isCompleted ? 'This workout module has been officially cataloged and scored. Re-submissions are locked.' : 'To earn credit for this problem, explicitly document your conceptual methodology below.'}
                            </span>
                        </div>
                        
                        ${ex.questions.map((q, idx) => {
                            const historicValue = savedAnswers[idx] || "";
                            return `
                                <div style="margin-bottom: 15px;">
                                    <label style="font-size: 0.85rem; font-weight:600; color: #fff; display: block; margin-bottom: 6px;">Question ${idx+1}: ${q}</label>
                                    <textarea class="solve-input-${ex.id}" rows="3" 
                                        placeholder="Type your step-by-step breakdown derivation method here..." 
                                        ${isCompleted ? 'disabled style="width: 100%; padding: 12px; font-size: 0.9rem; background: #0b0b0b; color: #888; border: 1px solid #222; border-radius: 8px; resize: none; font-family: inherit; line-height: 1.4;"' : 'style="width: 100%; padding: 12px; font-size: 0.9rem; background: #111; color: #fff; border: 1px solid #444; border-radius: 8px; resize: vertical; font-family: inherit; line-height: 1.4;"'}>${historicValue}</textarea>
                                </div>
                            `;
                        }).join('')}
                        <button class="ex-btn ex-btn-accent" id="submit-btn-${ex.id}" data-submit-derivation="${ex.id}" style="padding: 12px; font-weight: 800;" ${isCompleted ? 'disabled style="opacity: 0.3; cursor: not-allowed;"' : ''}>
                            ${isCompleted ? 'Verification Complete' : 'Submit Verification for Review'}
                        </button>
                    </div>
                ` : `
                    <div id="solve-panel-${ex.id}" class="hidden" style="background: rgba(0,0,0,0.3); padding: 20px; border-radius: 12px; margin-bottom: 15px; border: 1px solid rgba(255,255,255,0.05);">
                        <div style="background: ${isCompleted ? 'rgba(46, 204, 113, 0.1)' : 'rgba(241, 196, 15, 0.1)'}; padding: 12px; border-radius: 6px; border-left: 4px solid ${isCompleted ? '#2ecc71' : '#f1c40f'}; margin-bottom: 15px;">
                            <strong style="color: ${isCompleted ? '#2ecc71' : '#f1c40f'}; font-size: 0.8rem; letter-spacing: 1px; display: block; margin-bottom: 4px;">
                                ${isCompleted ? '🔒 ENTRY RECORD LOCKED' : '📌 RESPONSE INSTRUCTIONS'}
                            </strong>
                            <span style="font-size: 0.75rem; opacity: 0.8; line-height: 1.4;">
                                ${isCompleted ? 'Your submission has been cataloged. Answers are frozen to secure point parity.' : 'Provide a concise, scientifically accurate description containing proper terminology to verify this module.'}
                            </span>
                        </div>
                        
                        <label style="font-size: 0.85rem; font-weight:600; color: #fff; display: block; margin-bottom: 6px;">Your Scientific Explanation:</label>
                        <textarea id="direct-ans-${ex.id}" rows="3" placeholder="Type structural conceptual description..." 
                            ${isCompleted ? 'disabled style="width: 100%; padding: 12px; font-size: 0.9rem; background: #0b0b0b; color: #888; border: 1px solid #222; border-radius: 8px; resize: none; margin-bottom: 12px; font-family: inherit; line-height: 1.4;"' : 'style="width: 100%; padding: 12px; font-size: 0.9rem; background: #111; color: #fff; border: 1px solid #444; border-radius: 8px; resize: vertical; margin-bottom: 12px; font-family: inherit; line-height: 1.4;"'}>${savedAnswers[0] || ""}</textarea>
                        <button class="ex-btn ex-btn-accent" id="submit-btn-${ex.id}" data-submit-direct="${ex.id}" data-correct="${btoa(ex.ans)}" style="padding: 12px; font-weight: 800;" ${isCompleted ? 'disabled style="opacity: 0.3; cursor: not-allowed;"' : ''}>
                            ${isCompleted ? 'Integrity Verified' : 'Verify Answer Integrity'}
                        </button>
                    </div>
                `}

                <div id="sol-display-${ex.id}" style="margin-top: 10px;">
                    ${(isUnlocked && isVisible) ? `
                        <div class="solution-box" style="line-height: 1.6; padding: 16px; font-size: 0.92rem; background: rgba(46, 204, 113, 0.08);">
                            <div style="font-weight: 800; text-transform: uppercase; font-size: 0.75rem; letter-spacing: 1px; margin-bottom: 10px; color: #2ecc71;">💡 VERIFIED SOLUTIONS ARCHIVE:</div>
                            ${isSpecialCategory ? ex.ans : ex.sol}
                        </div>
                    ` : ''}
                </div>

                <div class="exercise-action-bar" style="margin-top: 15px; display: flex; gap: 12px;">
                    <button class="ex-btn ex-btn-secondary" id="reveal-btn-${ex.id}" data-reveal-id="${ex.id}" data-reveal-special="${isSpecialCategory}" style="padding: 12px;">
                        ${isUnlocked ? (isVisible ? 'Hide Solution' : (isSpecialCategory ? 'Show Answer' : 'Show Solution')) : (isSpecialCategory ? 'Show Answer (-100 PTS)' : 'Show Solution (-100 PTS)')}
                    </button>
                    
                    <button class="ex-btn ex-btn-accent" style="padding: 12px;" data-toggle-solve="${ex.id}">
                        ${isCompleted ? 'View My Answer' : (isSpecialCategory ? 'Input Answer' : 'Solve')}
                    </button>
                </div>
            </div>
        </div>
    `;
}

// TRANSACTION & TOGGLE SWITCH COMBINED
// Global tracking object to temporarily cache execution elements during confirmation steps
let pendingExerciseTransaction = null;

function toggleExerciseSolution(id, isSpecialCategory) {
    if (!u || !userDB[u]) return;
    
    // Initialize tracking arrays if missing in localDB profiles
    if (!userDB[u].unlockedExercises) {
        userDB[u].unlockedExercises = [];
    }

    const isUnlocked = userDB[u].unlockedExercises.includes(id);
    const currentPoints = userDB[u].points || 0;
    const resourceName = isSpecialCategory ? "Answer Steps" : "Detailed Solution Path";

    // CASE 1: If the file is NOT unlocked yet, intercept with our confirmation modal
    if (!isUnlocked) {
        if (currentPoints < 100) {
            showAlert(`Transaction Declined!<br><span style="font-size:0.8rem; opacity:0.6;">You have <b>${currentPoints} PTS</b>, but this resource requires 100 PTS.</span>`);
            return;
        }

        // Cache parameters to process after user checks confirmation buttons
        pendingExerciseTransaction = { id, isSpecialCategory };

        // Construct context message display
        const modalContentEl = document.getElementById('exerciseModalContent');
        modalContentEl.innerHTML = `
            Are you sure you want to unlock this ${resourceName}?<br>
            <div style="background: rgba(255,255,255,0.04); border: 1px solid var(--border); padding: 12px; border-radius: 8px; margin-top: 15px; text-align: left;">
                <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
                    <span>Your Current Balance:</span> <strong style="color: #00ff88;">${currentPoints} PTS</strong>
                </div>
                <div style="display:flex; justify-content:space-between;">
                    <span>Cost to Unlock:</span> <strong style="color: #ff4d4d;">-100 PTS</strong>
                </div>
            </div>
        `;

        // Update action pointer bindings dynamically
        document.getElementById('exerciseConfirmYesBtn').onclick = executeConfirmedExercisePurchase;

        // Reveal modal
        document.getElementById('exerciseConfirmModal').classList.remove('hidden');
        return; 
    }

    // CASE 2: Already unlocked previously? Proceed directly to normal show/hide toggle logic
    processSolutionVisibilityToggle(id, isSpecialCategory);
}

// THE SECOND-STAGE TRANSACTION HANDLER
function executeConfirmedExercisePurchase() {
    if (!pendingExerciseTransaction || !u || !userDB[u]) return;

    const { id, isSpecialCategory } = pendingExerciseTransaction;
    
    // Safety verification check against duplicate edge triggers
    if (!userDB[u].unlockedExercises.includes(id)) {
        userDB[u].points -= 100;
        userDB[u].unlockedExercises.push(id);
        
        saveAndSync(); // Commit changes into local storage structure safely
        if (typeof triggerPointAnim === 'function') triggerPointAnim(100, true);
    }

    // Reset parameters and wipe modals off screen
    closeExerciseModal();
    
    // Instantly process display adjustments
    processSolutionVisibilityToggle(id, isSpecialCategory);
}

// MODAL CLOSURE UTILITIES
function closeExerciseModal() {
    document.getElementById('exerciseConfirmModal').classList.add('hidden');
    pendingExerciseTransaction = null;
}

// CONTEXTUAL VIEW RE-RENDER COMPONENT
function processSolutionVisibilityToggle(id, isSpecialCategory) {
    const targetBox = document.getElementById(`sol-display-${id}`);
    const rBtn = document.getElementById(`reveal-btn-${id}`);

    activeSolutionVisibility[id] = !activeSolutionVisibility[id];
    const shouldDisplay = activeSolutionVisibility[id];

    let resourceContent = "";
    let foundExercise = false;
    const userGrade = getCurrentUserGrade();

    // Look inside the specific active grade directory
    const gradeData = exerciseDatabase[userGrade] || {};
    for (let subject in gradeData) {
        for (let tier in gradeData[subject]) {
            let found = gradeData[subject][tier].find(e => e.id === id);
            if (found) {
                resourceContent = isSpecialCategory ? found.ans : found.sol;
                foundExercise = true;
                break;
            }
        }
        if (foundExercise) break;
    }

    if (shouldDisplay) {
        if (targetBox) {
            targetBox.innerHTML = `
                <div class="solution-box" style="line-height: 1.6; padding: 16px; font-size: 0.92rem; background: rgba(46, 204, 113, 0.08);">
                    <div style="font-weight: 800; text-transform: uppercase; font-size: 0.75rem; letter-spacing: 1px; margin-bottom: 10px; color: #2ecc71;">💡 VERIFIED SOLUTIONS ARCHIVE:</div>
                    ${resourceContent}
                </div>
            `;
        }
        if (rBtn) rBtn.innerText = isSpecialCategory ? "Hide Answer" : "Hide Solution";
    } else {
        if (targetBox) targetBox.innerHTML = "";
        if (rBtn) {
            rBtn.innerText = isSpecialCategory ? "Show Answer" : "Show Solution";
        }
    }
}

// Fixed Submission Core to locate checking objects by Grade Layer
function submitDerivationSolution(id) {
    if (userDB[u] && userDB[u].completedExercises && userDB[u].completedExercises.includes(id)) {
        showAlert("🔒 Submission Rejected: This module's points have already been claimed and locked!");
        return; 
    }

    const inputs = document.querySelectorAll(`.solve-input-${id}`);
    let allFilled = true;
    let combinedInputText = "";
    let valuesToSave = [];
    
    inputs.forEach(inp => {
        const val = inp.value.trim();
        if (!val) allFilled = false;
        combinedInputText += " " + val.toLowerCase();
        valuesToSave.push(inp.value); 
    });

    if (!allFilled) {
        showAlert("Please fill out all your execution method workspaces before submitting!");
        return;
    }

    // Locate matching elements specifically inside active grade configuration
    let exerciseObj = null;
    const userGrade = getCurrentUserGrade();
    const gradeData = exerciseDatabase[userGrade] || {};
    
    for (let subject in gradeData) {
        for (let tier in gradeData[subject]) {
            let found = gradeData[subject][tier].find(e => e.id === id);
            if (found) { exerciseObj = found; break; }
        }
    }

    const cleanSolText = exerciseObj ? exerciseObj.sol.replace(/<[^>]*>/g, '').toLowerCase() : "";
    const structuralKeywords = cleanSolText.split(/\s+/).filter(w => w.length > 4); 
    let matchingHits = 0;
    
    structuralKeywords.forEach(word => {
        if (combinedInputText.includes(word)) matchingHits++;
    });

    const accuracyScore = structuralKeywords.length > 0 ? (matchingHits / structuralKeywords.length) : 1;

    if (accuracyScore >= 0.30) {
        if (!userDB[u].completedExercises) userDB[u].completedExercises = [];
        if (!userDB[u].savedExerciseSubmissions) userDB[u].savedExerciseSubmissions = {};

        userDB[u].completedExercises.push(id);
        userDB[u].savedExerciseSubmissions[id] = valuesToSave;

        addPoints(50, "Completed Workout Verification");
        saveAndSync(); 

        showAlert("Methodology analysis passed! Exercise officially closed out. +50 PTS");
        renderExerciseTiers(activeExerciseSubject);
    } else {
        showAlert("Accuracy verification failed. Your step-by-step reasoning seems incomplete. Review your equations and try again!");
    }
}

// Verification engine for categorical fields (Biology/Earth Science)
function submitDirectAnswer(id, encryptedCorrect) {
    // CRITICAL SECURITY FIX: Strict guard clause to block duplicate scoring
    if (userDB[u] && userDB[u].completedExercises && userDB[u].completedExercises.includes(id)) {
        showAlert("🔒 Submission Rejected: This conceptual answer is already recorded and locked!");
        return; // Exits the function completely so NO extra points are given
    }

    const inputEl = document.getElementById(`direct-ans-${id}`);
    if (!inputEl || !inputEl.value.trim()) {
        showAlert("Please type an answer string to submit evaluation!");
        return;
    }

    const correctStr = atob(encryptedCorrect).trim().toLowerCase();
    const studentStr = inputEl.value.trim().toLowerCase();

    if (studentStr === correctStr || (correctStr.includes(studentStr) && studentStr.length >= 3)) {
        // Initialize structural tracking fields if they are missing
        if (!userDB[u].completedExercises) userDB[u].completedExercises = [];
        if (!userDB[u].savedExerciseSubmissions) userDB[u].savedExerciseSubmissions = {};

        // Commit completion to database state
        userDB[u].completedExercises.push(id);
        userDB[u].savedExerciseSubmissions[id] = [inputEl.value];

        addPoints(50, "Correct Conceptual Answer");
        saveAndSync(); // Permanently saves changes to localStorage 

        showAlert("Concept verified as fully accurate! Exercise closed out. +50 PTS");
        
        // Instantly reload UI to transform elements to disabled state
        renderExerciseTiers(activeExerciseSubject);
    } else {
        showAlert("Incorrect answer formulation. Check your textbook definitions and try again!");
    }
}

function getCurrentUserGrade() {
    // Falls back safely to Grade 9 if no user profile state is configured yet
    if (userDB && u && userDB[u] && userDB[u].grade) {
        return String(userDB[u].grade);
    }
    return '9';
}

function renderExerciseTiers(subject) {
    const container = document.getElementById('tiersContainer');
    const userGrade = getCurrentUserGrade();
    
    // CRITICAL UPDATE: Extract tiers based on active Grade Level first, then Subject Category
    const gradeData = exerciseDatabase[userGrade] || {};
    const tiers = gradeData[subject] || {};
    
    if (Object.keys(tiers).length === 0) {
        container.innerHTML = `
            <div style="text-align:center; padding: 40px; opacity:0.5;">
                <p>No exercises recorded for Grade ${userGrade} ${subject} yet.</p>
                <small style="font-size:0.75rem;">Check your profile grade settings to toggle material levels.</small>
            </div>`;
        return;
    }

    container.innerHTML = Object.keys(tiers).map(tierName => `
        <div class="tier-group">
            <div class="tier-header" data-action="toggleSiblingHidden">
                <span>📁 Grade ${userGrade} • ${tierName}</span>
                <span style="font-size: 0.8rem; opacity: 0.5;">▼</span>
            </div>
            <div class="tier-content hidden">
                ${tiers[tierName].map(ex => renderSingleCard(ex, subject)).join('')}
            </div>
        </div>
    `).join('');
}

// =========================================================================
// QUICK REACTION GAMEPLAY STATE MANAGEMENT SYSTEM
// =========================================================================
let qrTimerInstance = null;
let qrTimeRemaining = 0;
let qrRunningPointsEarned = 0;
let qrActiveCorrectAnswer = null;
let qrIsFrozen = false;

// 1. TIMESTAMPS & ENTRY SECURITY COOLDOWN CONTROLLER
function handleQuickReactionEntry() {
    if (!u || !userDB[u]) return;
    
    const now = Date.now();
    const lastPlayed = userDB[u].qrLastPlayedTimestamp || 0;
    const coolingWindow = 30 * 60 * 1000; // 30 Minutes calculation threshold
    
    if (now - lastPlayed < coolingWindow) {
        const remainingMinutes = Math.ceil((coolingWindow - (now - lastPlayed)) / 60000);
        const currentPoints = userDB[u].points || 0;

        // 1. Create the overlay container
        const overlay = document.createElement('div');
        overlay.style = "position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 9999; font-family: sans-serif; color: #fff; padding: 20px; box-sizing: border-box;";

        // 2. Inject your exact reference styles mixed with the cooldown info
        overlay.innerHTML = `
            <div style="background: #1a1a1a; padding: 24px; border-radius: 12px; border: 1px solid #333; max-width: 380px; width: 100%; text-align: center; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
                <div style="font-weight: bold; font-size: 1.1rem; margin-bottom: 8px;">🔒 SYSTEM COOLDOWN ACTIVE</div>
                <div style="font-size: 14px; color: #aaa; line-height: 1.4;">You must wait ${remainingMinutes} more minutes to access the simulator for free.</div>
                
                <div style="background: rgba(255,255,255,0.04); border: 1px solid var(--border, #333); padding: 12px; border-radius: 8px; margin-top: 15px; text-align: left; font-size: 14px;">
                    <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
                        <span>Your Current Balance:</span> <strong style="color: #00ff88;">${currentPoints} PTS</strong>
                    </div>
                    <div style="display:flex; justify-content:space-between;">
                        <span>Cost to Bypass:</span> <strong style="color: #ff4d4d;">-150 PTS</strong>
                    </div>
                </div>

                <div style="margin-top: 20px; display: flex; justify-content: flex-end; gap: 10px;">
                    <button id="cancelBypassBtn" style="background: transparent; color: #aaa; border: 1px solid #444; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 14px;">Wait</button>
                    <button id="confirmBypassBtn" style="background: #00ff88; color: #000; border: none; padding: 8px 16px; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 14px;">Bypass</button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        // 3. Handle Cancel ("if (!choice) return;")
        overlay.querySelector('#cancelBypassBtn').addEventListener('click', () => {
            overlay.remove();
        });

        // 4. Handle Confirm (Runs the exact logic your old code ran after a true choice)
        overlay.querySelector('#confirmBypassBtn').addEventListener('click', () => {
            overlay.remove();

            if (currentPoints < 150) {
                showAlert(`Transaction Declined!<br><span style='font-size:0.8rem; opacity:0.7;'>You only possess <b>${currentPoints} PTS</b>. This bypass requires 150 PTS.</span>`);
                return;
            }
            
            userDB[u].points -= 150;
            if (typeof triggerPointAnim === 'function') triggerPointAnim(150, true);
            saveAndSync();
            navigateTo('QuickReactionLobbyView');
        });

    } else {
        navigateTo('QuickReactionLobbyView');
    }
}

// 2. RUNTIME SIMULATOR INITIALIZATION TRIPPERS
// Global trackers
let qrSelectedDifficulty = 'easy'; 

// =========================================================================
// MASSIVE EXPANDED QUESTION POOL MATRIX (GRADES 7, 8, 9)
// =========================================================================
const ARCADE_QUESTION_POOL = {
    Math: {
        "7": {
            easy: [
                { q: "Solve for x: x + 3 = 8", a: "5", options: ["5", "3", "11", "2"] },
                { q: "Solve for x: 2x = 10", a: "5", options: ["5", "2", "8", "20"] },
                { q: "Solve for x: x - 4 = 6", a: "10", options: ["10", "2", "4", "14"] },
                { q: "Solve for x: 3x = 12", a: "4", options: ["4", "9", "15", "3"] },
                { q: "Solve for x: x + 7 = 7", a: "0", options: ["0", "7", "14", "-7"] },
                { q: "Solve for x: x - 5 = 15", a: "20", options: ["20", "10", "25", "15"] },
                { q: "Solve for x: 4x = 24", a: "6", options: ["6", "4", "8", "12"] },
                { q: "Solve for x: x + 12 = 20", a: "8", options: ["8", "12", "32", "6"] }
            ],
            medium: [
                { q: "Solve for x: 2x + 4 = 12", a: "4", options: ["4", "8", "3", "6"] },
                { q: "Solve for x: 3x - 1 = 14", a: "5", options: ["5", "4", "13", "15"] },
                { q: "Solve for x: 5x + 5 = 30", a: "5", options: ["5", "6", "25", "7"] },
                { q: "Solve for x: 4x - 2 = 10", a: "3", options: ["3", "4", "2", "6"] },
                { q: "Solve for x: 2x + 10 = 20", a: "5", options: ["5", "10", "15", "8"] },
                { q: "Solve for x: 3x + 9 = 27", a: "6", options: ["6", "9", "12", "4"] },
                { q: "Solve for x: 6x - 4 = 20", a: "4", options: ["4", "6", "8", "2"] }
            ],
            hard: [
                { q: "Solve for x: 3(x + 2) = 15", a: "3", options: ["3", "5", "1", "2"] },
                { q: "Solve for x: 2x + 5 = x + 9", a: "4", options: ["4", "14", "2", "5"] },
                { q: "Solve for x: 5x - 3 = 2x + 6", a: "3", options: ["3", "9", "1", "4"] },
                { q: "Evaluate: -4 * (-3) + 5", a: "17", options: ["17", "-7", "7", "-17"] },
                { q: "Solve for x: (x / 2) + 5 = 9", a: "8", options: ["8", "4", "14", "2"] },
                { q: "Solve for x: 4(x - 1) = 2(x + 4)", a: "6", options: ["6", "4", "2", "8"] },
                { q: "Solve for x: x/3 + 2 = x/2", a: "12", options: ["12", "6", "4", "24"] }
            ]
        },
        "8": {
            easy: [
                { q: "Find the area of a square with side length 5cm.", a: "25 cm²", options: ["25 cm²", "20 cm²", "10 cm²", "50 cm²"] },
                { q: "Find the perimeter of a rectangle with length 4cm and width 3cm.", a: "14cm", options: ["14cm", "12cm", "7cm", "24cm"] },
                { q: "What is 15% of 200?", a: "30", options: ["30", "15", "20", "45"] },
                { q: "Simplify: x³ * x²", a: "x⁵", options: ["x⁵", "x⁶", "x¹", "2x⁵"] },
                { q: "What is the square root of 64?", a: "8", options: ["8", "6", "7", "9"] },
                { q: "Find the volume of a cube with edge 3cm.", a: "27 cm³", options: ["27 cm³", "9 cm³", "18 cm³", "81 cm³"] },
                { q: "What is the square root of 144?", a: "12", options: ["12", "14", "11", "16"] }
            ],
            medium: [
                { q: "A right triangle has legs 3cm and 4cm. Find the hypotenuse.", a: "5cm", options: ["5cm", "7cm", "12cm", "6cm"] },
                { q: "A right triangle has legs 6cm and 8cm. Find the hypotenuse.", a: "10cm", options: ["10cm", "14cm", "12cm", "48cm"] },
                { q: "Simplify: (x⁴)³", a: "x¹²", options: ["x¹²", "x⁷", "x⁴³", "3x⁴"] },
                { q: "Solve: x² = 121", a: "11", options: ["11", "12", "21", "10"] },
                { q: "What is the value of 2⁻³?", a: "1/8", options: ["1/8", "-8", "8", "1/6"] },
                { q: "Find the hypotenuse of a right triangle with sides 5cm and 12cm.", a: "13cm", options: ["13cm", "15cm", "17cm", "14cm"] },
                { q: "Simplify: 2x⁴ * 3x³", a: "6x⁷", options: ["6x⁷", "5x⁷", "6x¹²", "5x¹²"] }
            ],
            hard: [
                { q: "Find a root solution for: x² - 5x + 6 = 0", a: "2", options: ["2", "5", "0", "-2"] },
                { q: "A right triangle has a leg of 5cm and a hypotenuse of 13cm. Find the missing leg.", a: "12cm", options: ["12cm", "8cm", "18cm", "14cm"] },
                { q: "Solve for x: x² - 9 = 0", a: "3", options: ["3", "9", "0", "4.5"] },
                { q: "Simplify: (2x³)²", a: "4x⁶", options: ["4x⁶", "2x⁶", "4x⁵", "2x⁵"] },
                { q: "If 2x + y = 10 and x = 3, what is y?", a: "4", options: ["4", "7", "1", "3"] },
                { q: "Find a root solution for: x² - 6x + 8 = 0", a: "4", options: ["4", "2", "-2", "0"] },
                { q: "Find the distance between coordinate points (1,1) and (4,5).", a: "5", options: ["5", "7", "25", "6"] }
            ]
        },
        "9": {
            easy: [
                { q: "Simplify the expression: 3x + 4x - 2x", a: "5x", options: ["5x", "7x", "9x", "x"] },
                { q: "What is the slope of the line y = 3x + 2?", a: "3", options: ["3", "2", "-3", "1"] },
                { q: "Evaluate: 5⁰", a: "1", options: ["1", "5", "0", "-5"] },
                { q: "If f(x) = 2x + 3, find f(4).", a: "11", options: ["11", "9", "14", "8"] },
                { q: "Find the midpoint between coordinates (2,4) and (4,4).", a: "(3,4)", options: ["(3,4)", "(2,4)", "(6,8)", "(3,2)"] },
                { q: "What is the slope of a horizontal line?", a: "0", options: ["0", "1", "Undefined", "-1"] }
            ],
            medium: [
                { q: "Find a root solution for: x² - 7x + 12 = 0", a: "3", options: ["3", "4", "0", "-1"] },
                { q: "What is the y-intercept of the line 2x + 3y = 6?", a: "2", options: ["2", "3", "6", "0"] },
                { q: "Factor completely: x² - 16", a: "(x-4)(x+4)", options: ["(x-4)(x+4)", "(x-4)²", "(x+4)²", "x(x-16)"] },
                { q: "Solve the linear system: x + y = 5, x - y = 1. Find x.", a: "3", options: ["3", "2", "4", "1"] },
                { q: "Find the distance between points (0,0) and (3,4).", a: "5", options: ["5", "7", "25", "1"] },
                { q: "Factor completely: x² - 5x - 6", a: "(x-6)(x+1)", options: ["(x-6)(x+1)", "(x-3)(x-2)", "(x+6)(x-1)", "(x-5)(x+1)"] }
            ],
            hard: [
                { q: "In trigonometry, what is the exact value of sin(30°)?", a: "0.5", options: ["0.5", "1", "0", "0.866"] },
                { q: "In trigonometry, what is the exact value of cos(0°)?", a: "1", options: ["1", "0", "0.5", "Undefined"] },
                { q: "Find the vertex layout point of the parabola: f(x) = x² - 4x + 5", a: "(2,1)", options: ["(2,1)", "(4,5)", "(0,5)", "(-2,1)"] },
                { q: "Solve for x: log_2(x) = 3", a: "8", options: ["8", "6", "9", "3"] },
                { q: "What is the discriminant value of the quadratic equation: x² - 4x + 4 = 0?", a: "0", options: ["0", "16", "8", "-16"] },
                { q: "In trigonometry, what is the exact value of tan(45°)?", a: "1", options: ["1", "0", "√2", "Undefined"] }
            ]
        }
    },
    Physics: {
        "7": {
            easy: [
                { q: "Which of the following is a basic state of matter?", a: "Solid", options: ["Solid", "Electricity", "Light", "Heat"] },
                { q: "What measuring unit monitors temperature readings?", a: "Celsius", options: ["Celsius", "Meter", "Gram", "Liter"] },
                { q: "True or False: Sound travels faster in water than in air.", a: "True", options: ["True", "False", "Equal", "Sound cannot travel in water"] },
                { q: "What primary source provides light and heat to Earth?", a: "The Sun", options: ["The Sun", "The Moon", "Volcanoes", "Electricity"] },
                { q: "What tool is utilized to measure mass?", a: "Balance Scale", options: ["Balance Scale", "Ruler", "Thermometer", "Beaker"] },
                { q: "Which of these objects is transparent?", a: "Clear Glass", options: ["Clear Glass", "Wood", "Cardboard", "Iron Plate"] }
            ],
            medium: [
                { q: "An object travels 40 meters in 10 seconds. Calculate its speed.", a: "4 m/s", options: ["4 m/s", "400 m/s", "14 m/s", "0.25 m/s"] },
                { q: "An object travels 100 meters in 5 seconds. Calculate its speed.", a: "20 m/s", options: ["20 m/s", "500 m/s", "105 m/s", "25 m/s"] },
                { q: "Convert 2 kilometers into meters.", a: "2000m", options: ["2000m", "200m", "20m", "20000m"] },
                { q: "What type of energy is stored in a stretched rubber band?", a: "Potential Energy", options: ["Potential Energy", "Kinetic Energy", "Thermal Energy", "Chemical Energy"] },
                { q: "Which material acts as an excellent electrical conductor?", a: "Copper", options: ["Copper", "Rubber", "Glass", "Plastic"] }
            ],
            hard: [
                { q: "If an object has a mass of 5kg on Earth, what is its approximate weight? (g ≈ 10m/s²)", a: "50 N", options: ["50 N", "5 N", "0.5 N", "500 N"] },
                { q: "What type of heat transfer occurs through direct physical contact?", a: "Conduction", options: ["Conduction", "Convection", "Radiation", "Insulation"] },
                { q: "A 10kg box is pulled with 30N of force. Find its acceleration.", a: "3 m/s²", options: ["3 m/s²", "300 m/s²", "0.3 m/s²", "20 m/s²"] },
                { q: "What is the density of an object with a mass of 20g and a volume of 5cm³?", a: "4 g/cm³", options: ["4 g/cm³", "100 g/cm³", "0.25 g/cm³", "15 g/cm³"] },
                { q: "Which color absorbs the most thermal radiation?", a: "Black", options: ["Black", "White", "Silver", "Red"] }
            ]
        },
        "8": {
            easy: [
                { q: "What physical property causes an object to resist changes to its motion?", a: "Inertia", options: ["Inertia", "Velocity", "Volume", "Friction"] },
                { q: "What is the standard unit of Force?", a: "Newton (N)", options: ["Newton (N)", "Joule (J)", "Watt (W)", "Pascal (Pa)"] },
                { q: "What primary force pulls objects down toward Earth's center?", a: "Gravity", options: ["Gravity", "Magnetism", "Friction", "Air Resistance"] },
                { q: "What unit gauges electrical resistance variables?", a: "Ohm", options: ["Ohm", "Volt", "Ampere", "Watt"] },
                { q: "Friction always acts in a direction ______ to the motion.", a: "Opposite", options: ["Opposite", "Parallel", "Identical", "Perpendicular"] }
            ],
            medium: [
                { q: "A force of 10 N moves an object 5 meters. Calculate the work done.", a: "50 J", options: ["50 J", "2 J", "15 J", "500 J"] },
                { q: "A force of 20 N moves an object 4 meters. Calculate the work done.", a: "80 J", options: ["80 J", "5 J", "24 J", "160 J"] },
                { q: "What basic component regulates electrical current paths inside circuits?", a: "Resistor", options: ["Resistor", "Battery", "Wire", "Switch"] },
                { q: "Calculate the pressure when a 50 N force acts over an area of 2 m².", a: "25 Pa", options: ["25 Pa", "100 Pa", "52 Pa", "10 Pa"] },
                { q: "An object accelerates from 0 to 20 m/s over 5 seconds. Find its acceleration rate.", a: "4 m/s²", options: ["4 m/s²", "100 m/s²", "15 m/s²", "2 m/s²"] }
            ],
            hard: [
                { q: "Calculate fluid pressure at 2m deep inside a liquid water reservoir. (p=1000kg/m³, g=10m/s²)", a: "20000 Pa", options: ["20000 Pa", "2000 Pa", "5000 Pa", "10000 Pa"] },
                { q: "What is the mechanical advantage of a lever where the effort arm is 6m and load arm is 2m?", a: "3", options: ["3", "12", "0.33", "4"] },
                { q: "An electrical device pulls 2 Amps under a 12 Volt line. Find its power output.", a: "24 W", options: ["24 W", "6 W", "14 W", "48 W"] },
                { q: "A sound wave has a frequency of 200 Hz and a wavelength of 2m. Find its wave speed.", a: "400 m/s", options: ["400 m/s", "100 m/s", "202 m/s", "0.01 m/s"] },
                { q: "What physical property remains constant when a gas undergoes isothermal expansion?", a: "Temperature", options: ["Temperature", "Pressure", "Volume", "Mass Capacity"] }
            ]
        },
        "9": {
            easy: [
                { q: "What unit identifies acceleration speed modifications over time?", a: "m/s²", options: ["m/s²", "m/s", "Joules", "Watts"] },
                { q: "What form of energy is possessed by a moving object?", a: "Kinetic Energy", options: ["Kinetic Energy", "Potential Energy", "Chemical Energy", "Nuclear Energy"] },
                { q: "What basic particle carries a negative electrical charge signature?", a: "Electron", options: ["Electron", "Proton", "Neutron", "Atom"] },
                { q: "What type of lens converges parallel rays of light?", a: "Convex Lens", options: ["Convex Lens", "Concave Lens", "Flat Mirror", "Prism"] },
                { q: "What is the frequency unit equivalent to cycles per second?", a: "Hertz (Hz)", options: ["Hertz (Hz)", "Decibel (dB)", "Newton", "Joule"] }
            ],
            medium: [
                { q: "Calculate the force required to accelerate a 5kg mass at 3 m/s².", a: "15 N", options: ["15 N", "8 N", "1.6 N", "45 N"] },
                { q: "Calculate the force required to accelerate a 10kg mass at 2 m/s².", a: "20 N", options: ["20 N", "12 N", "5 N", "50 N"] },
                { q: "Find the momentum of a 5kg object moving at 4 m/s. (p = m * v)", a: "20 kg·m/s", options: ["20 kg·m/s", "9 kg·m/s", "1.25 kg·m/s", "40 kg·m/s"] },
                { q: "A 60W lightbulb runs for 10 seconds. Find the total energy used.", a: "600 J", options: ["600 J", "6 J", "70 J", "0.16 J"] },
                { q: "What type of wave is a sound wave?", a: "Longitudinal Wave", options: ["Longitudinal Wave", "Transverse Wave", "Electromagnetic Wave", "Surface Wave"] }
            ],
            hard: [
                { q: "What kinetic energy is generated by a 4kg projectile moving at 3 m/s? (KE = 0.5 * m * v²)", a: "18 J", options: ["18 J", "36 J", "12 J", "6 J"] },
                { q: "An object is dropped from a cliff. Find its velocity after 3 seconds of freefall. (g = 9.8m/s²)", a: "29.4 m/s", options: ["29.4 m/s", "9.8 m/s", "14.7 m/s", "44.1 m/s"] },
                { q: "Two resistors (4 ohms and 6 ohms) are wired in series. Find total resistance.", a: "10 ohms", options: ["10 ohms", "2.4 ohms", "24 ohms", "2 ohms"] },
                { q: "What is the total resistance of two 4-ohm resistors wired in parallel?", a: "2 ohms", options: ["2 ohms", "8 ohms", "4 ohms", "1 ohm"] },
                { q: "An object is placed 10cm away from a convex lens with focal length 5cm. Find the image distance.", a: "10cm", options: ["10cm", "5cm", "20cm", "Infinite"] }
            ]
        }
    },
    Chemistry: {
        "7": {
            easy: [
                { q: "Is melting an ice cube a physical or chemical change?", a: "Physical Change", options: ["Physical Change", "Chemical Change", "Atomic Decay", "None"] },
                { q: "What is the chemical formula for pure water?", a: "H₂O", options: ["H₂O", "CO₂", "O₂", "H₂O₂"] },
                { q: "What gas molecule do humans breathe out as waste?", a: "CO₂", options: ["CO₂", "O₂", "N₂", "H₂"] },
                { q: "What state of matter has a definite volume but no definite shape?", a: "Liquid", options: ["Liquid", "Solid", "Gas", "Plasma"] },
                { q: "Is dissolving sugar into water a physical or chemical change?", a: "Physical Change", options: ["Physical Change", "Chemical Change", "Nuclear Change", "Biological Change"] }
            ],
            medium: [
                { q: "Which symbol represents pure gas Oxygen?", a: "O₂", options: ["O₂", "O", "Ox", "O₃"] },
                { q: "What type of mixture occurs when components settle into one single visual layer?", a: "Homogeneous Mixture", options: ["Homogeneous Mixture", "Heterogeneous Mixture", "Suspension", "Element"] },
                { q: "Which of the following represents a chemical compound?", a: "NaCl", options: ["NaCl", "O₂", "Au", "Fe"] },
                { q: "What is the main gas component found inside Earth's atmosphere?", a: "Nitrogen", options: ["Nitrogen", "Oxygen", "Carbon Dioxide", "Argon"] },
                { q: "Separating sand from water using a paper mesh is known as:", a: "Filtration", options: ["Filtration", "Evaporation", "Distillation", "Decantation"] }
            ],
            hard: [
                { q: "What specific name describes a mixture containing uniform particles that do not settle out over time?", a: "Colloid", options: ["Colloid", "Solution", "Suspension", "Alloy"] },
                { q: "What happens to the density of water when it transforms from liquid to solid ice?", a: "Decreases", options: ["Decreases", "Increases", "Stays Constant", "Doubles"] },
                { q: "Which pH value indicates a highly acidic liquid solution?", a: "2", options: ["2", "7", "9", "14"] },
                { q: "What form of chemical change occurs when iron breaks down in the presence of water and oxygen?", a: "Rusting (Oxidation)", options: ["Rusting (Oxidation)", "Combustion", "Neutralization", "Fermentation"] },
                { q: "What is the common name for the chemical compound Sodium Chloride?", a: "Table Salt", options: ["Table Salt", "Baking Soda", "Bleach", "Vinegar"] }
            ]
        },
        "8": {
            easy: [
                { q: "Identify the chemical symbol notation used to describe Sodium.", a: "Na", options: ["Na", "S", "So", "N"] },
                { q: "What is the atomic symbol for Iron?", a: "Fe", options: ["Fe", "I", "Ir", "In"] },
                { q: "What subatomic particle holds a positive charge profile?", a: "Proton", options: ["Proton", "Electron", "Neutron", "Positron"] },
                { q: "Where are protons and neutrons located inside an atom?", a: "Nucleus", options: ["Nucleus", "Electron Cloud", "Orbitals", "Outer Shell"] },
                { q: "Rows on the Periodic Table are called:", a: "Periods", options: ["Periods", "Groups", "Families", "Columns"] }
            ],
            medium: [
                { q: "What is the atomic number of Carbon (C)?", a: "6", options: ["6", "12", "14", "4"] },
                { q: "What is the atomic number of Oxygen (O)?", a: "8", options: ["8", "16", "6", "10"] },
                { q: "Columns on the Periodic Table are known as:", a: "Groups", options: ["Groups", "Periods", "Rows", "Lines"] },
                { q: "What are the horizontal rows on the periodic table called?", a: "Periods", options: ["Periods", "Groups", "Categories", "Blocks"] },
                { q: "An atom gets a negative charge configuration by:", a: "Gaining Electrons", options: ["Gaining Electrons", "Losing Electrons", "Gaining Protons", "Losing Neutrons"] }
            ],
            hard: [
                { q: "What outer valence electron capacity count tracks across Group 17 Halogens?", a: "7", options: ["7", "8", "1", "17"] },
                { q: "Elements in Group 18 are chemically unreactive and known as:", a: "Noble Gases", options: ["Noble Gases", "Halogens", "Alkali Metals", "Lanthanides"] },
                { q: "What type of chemical bond forms when two non-metal atoms share electrons?", a: "Covalent Bond", options: ["Covalent Bond", "Ionic Bond", "Metallic Bond", "Hydrogen Bond"] },
                { q: "What type of bond forms between a Metal and a Non-Metal via electron transfer?", a: "Ionic Bond", options: ["Ionic Bond", "Covalent Bond", "Metallic Bond", "Nuclear Bond"] },
                { q: "What is the total number of atoms present in a single molecule of H₂SO₄?", a: "7", options: ["7", "3", "6", "4"] }
            ]
        },
        "9": {
            easy: [
                { q: "What chemical compound name represents H₂O?", a: "Water", options: ["Water", "Hydrogen Peroxide", "Acid", "Methane"] },
                { q: "What are the starting substances on the left side of a chemical equation called?", a: "Reactants", options: ["Reactants", "Products", "Catalysts", "Solutes"] },
                { q: "What value scale is used to determine how basic or acidic a solution is?", a: "pH Scale", options: ["pH Scale", "Celsius Scale", "Richter Scale", "Mole Scale"] },
                { q: "What is the chemical formula for Carbon Dioxide?", a: "CO₂", options: ["CO₂", "CO", "C₂O", "CoO"] },
                { q: "A substance that speeds up a chemical reaction without being consumed is a:", a: "Catalyst", options: ["Catalyst", "Inhibitor", "Reactant", "Product"] }
            ],
            medium: [
                { q: "Identify the balanced reaction yield missing here: 2H₂ + O₂ → [???]", a: "2H₂O", options: ["2H₂O", "H₂O₂", "4OH", "O₃"] },
                { q: "Balance the equation: N₂ + 3H₂ → ___ NH₃.", a: "2", options: ["2", "1", "3", "4"] },
                { q: "A solution with a pH value of exactly 7 is considered:", a: "Neutral", options: ["Neutral", "Acidic", "Basic", "Alkaline"] },
                { q: "What type of reaction releases thermal energy into its surroundings?", a: "Exothermic", options: ["Exothermic", "Endothermic", "Catalytic", "Reversible"] }
            ],
            hard: [
                { q: "Calculate the total molecular weight mass of 2 moles of Carbon-12 atoms. (Atomic Mass ≈ 12g/mol)", a: "24g", options: ["24g", "12g", "6g", "48g"] },
                { q: "What is the molar mass of pure water (H₂O)? (H = 1g/mol, O = 16g/mol)", a: "18 g/mol", options: ["18 g/mol", "10 g/mol", "17 g/mol", "2 g/mol"] },
                { q: "What type of reaction follows the format layout pattern: A + BC → AC + B?", a: "Single Replacement", options: ["Single Replacement", "Synthesis", "Decomposition", "Double Replacement"] },
                { q: "What is Avogadro's constant value tracking the items inside one mole?", a: "6.02 x 10²³", options: ["6.02 x 10²³", "3.14 x 10¹¹", "9.8 x 10²", "1.6 x 10⁻¹⁹"] },
                { q: "What law states that matter cannot be created or destroyed during a chemical reaction?", a: "Law of Conservation of Mass", options: ["Law of Conservation of Mass", "Law of Definite Proportions", "Boyle's Law", "Ohm's Law"] }
            ]
        }
    }
};

function startQuickReactionGame() {
    const selectedSubject = document.getElementById('qr-subject-select').value;
    const selectedDuration = parseInt(document.getElementById('qr-time-select').value, 10);
    
    // Capture and save difficulty globally
    qrSelectedDifficulty = document.getElementById('qr-difficulty-select').value;
    
    qrTimeRemaining = selectedDuration;
    qrRunningPointsEarned = 0;
    qrIsFrozen = false;

    if (window.bottomNav) {
        bottomNav.classList.add('hidden');
    }

    document.getElementById('qr-timer-display').innerText = qrTimeRemaining;
    document.getElementById('qr-running-score').innerText = qrRunningPointsEarned;
    document.getElementById('qr-freeze-banner').classList.add('hidden');
    
    if (window.u && window.userDB && userDB[u]) {
        userDB[u].qrLastPlayedTimestamp = Date.now();
        saveAndSync();
    }
    
    navigateTo('QuickReactionGameView');
    injectNextArcadeQuestion(selectedSubject);
    
    clearInterval(qrTimerInstance);
    qrTimerInstance = setInterval(() => {
        if (!qrIsFrozen) {
            qrTimeRemaining--;
            document.getElementById('qr-timer-display').innerText = qrTimeRemaining;
            
            if (qrTimeRemaining <= 0) {
                terminateQuickReactionMatch();
            }
        }
    }, 1000);
}

function injectNextArcadeQuestion(subject) {
    let studentGrade = "9"; 
    if (window.u && window.userDB && userDB[u] && userDB[u].grade) {
        studentGrade = String(userDB[u].grade);
    } else if (window.currentAccount && currentAccount.grade) {
        studentGrade = String(currentAccount.grade);
    }
    
    if (studentGrade !== "7" && studentGrade !== "8" && studentGrade !== "9") {
        studentGrade = "9";
    }

    const subjectPool = ARCADE_QUESTION_POOL[subject] || ARCADE_QUESTION_POOL["Math"];
    const gradePool = subjectPool[studentGrade] || subjectPool["9"];
    const availableQuestions = gradePool[qrSelectedDifficulty] || gradePool["easy"];
    
    const selected = availableQuestions[Math.floor(Math.random() * availableQuestions.length)];
    
    let questionText = selected.q;
    qrActiveCorrectAnswer = selected.a;
    let optionsArray = [...selected.options];

    optionsArray = [...new Set(optionsArray)];
    optionsArray.sort(() => Math.random() - 0.5);
    
    document.getElementById('qr-question-text').innerText = questionText;
    const box = document.getElementById('qr-options-box');
    
    if (box) {
        box.innerHTML = optionsArray.map(opt => `
            <button class="qr-opt-card" data-action="processArcadeGuess" data-arcade-opt="${opt}" data-arcade-subject="${subject}">${opt}</button>
        `).join('');
    } else {
        console.error("Critical Error: 'qr-options-box' element could not be found in the DOM.");
    }
}

// =========================================================================
// UPDATED GUESS EVALUATION MATRIX WITH SCALED PENALTIES
// =========================================================================
function processArcadeGuess(chosenText, subject) {
    if (qrIsFrozen) return;

    if (chosenText === qrActiveCorrectAnswer) {
        // Award scaled point totals based on difficulty levels
        if (qrSelectedDifficulty === 'easy') {
            qrRunningPointsEarned += 5;
        } else if (qrSelectedDifficulty === 'medium') {
            qrRunningPointsEarned += 25;
        } else if (qrSelectedDifficulty === 'hard') {
            qrRunningPointsEarned += 100;
        }

        document.getElementById('qr-running-score').innerText = qrRunningPointsEarned;
        injectNextArcadeQuestion(subject);
    } else {
        // NEW FIXED LOGIC: Subtract penalty amounts matching the difficulty parameters
        let penaltyAmount = 1;
        if (qrSelectedDifficulty === 'easy') {
            penaltyAmount = 5;
        } else if (qrSelectedDifficulty === 'medium') {
            penaltyAmount = 25;
        } else if (qrSelectedDifficulty === 'hard') {
            penaltyAmount = 100;
        }

        qrRunningPointsEarned = Math.max(0, qrRunningPointsEarned - penaltyAmount);
        document.getElementById('qr-running-score').innerText = qrRunningPointsEarned;
        
        qrIsFrozen = true;
        let penaltySecondsLeft = 5;
        
        const banner = document.getElementById('qr-freeze-banner');
        const counterText = document.getElementById('qr-freeze-countdown');
        const cards = document.querySelectorAll('.qr-opt-card');
        
        cards.forEach(c => c.disabled = true);
        counterText.innerText = penaltySecondsLeft;
        banner.classList.remove('hidden');
        
        const lockClock = setInterval(() => {
            penaltySecondsLeft--;
            counterText.innerText = penaltySecondsLeft;
            
            if (penaltySecondsLeft <= 0) {
                clearInterval(lockClock);
                qrIsFrozen = false;
                banner.classList.add('hidden');
                injectNextArcadeQuestion(subject);
            }
        }, 1000);
    }
}

// 5. SESSION EXIT & WALLET POINT INJECTION COMPONENT
function terminateQuickReactionMatch() {
    clearInterval(qrTimerInstance);
    qrIsFrozen = false;
    
    // Commit calculations to account object structures safely
    if (userDB[u]) {
        userDB[u].points = (userDB[u].points || 0) + qrRunningPointsEarned;
        saveAndSync();
    }
    
    // Direct summary feedback presentation alert
    showAlert(`
        <div style="text-align: center;">
            <span style="font-size: 3rem;">🏆</span>
            <h3 style="color:#00ff88; font-weight:800; margin-top:10px;">MATCH SIMULATION COMPLETE</h3>
            <p style="font-size:0.95rem; line-height:1.4;">Your tactical score processing calculations generated a net output yield of:</p>
            <div style="background:rgba(255,255,255,0.04); border:1px solid #222; border-radius:6px; padding:12px; margin:15px 0; font-size:1.4rem; font-family:monospace; font-weight:800; color:#00ff88;">
                +${qrRunningPointsEarned} PTS
            </div>
            <span style="font-size:0.75rem; opacity:0.6;">This dividend balance has been securely recorded onto your user ledger files.</span>
        </div>
    `);
    
    // Clean escape route out back to main screen dashboard layout views
    navigateTo('vGames');
}

// Delegated click handlers to keep actions working after DOM swaps
document.addEventListener('click', (e) => {
    const sel = 'button, [data-action], [data-nav], [data-learn-topic], [data-open-subject], [data-select-exercise], [data-toggle-password], [data-show-auth], [data-slide], [data-buy-theme], [data-buy-item], [data-confirm-logout], [data-reveal-id], [data-submit-derivation], [data-submit-direct], [data-toggle-solve], [data-finish-lesson]';
    const btn = e.target.closest(sel);
    if (!btn) return;

    // LEARN buttons created dynamically use data-learn-topic
    if (btn.dataset && btn.dataset.learnTopic) {
        e.preventDefault();
        triggerCrawler(btn.dataset.learnTopic);
        return;
    }
    // Exercise: reveal solution / purchase
    if (btn.dataset && btn.dataset.revealId) {
        e.preventDefault();
        const isSpecial = String(btn.dataset.revealSpecial) === 'true';
        toggleExerciseSolution(btn.dataset.revealId, isSpecial);
        return;
    }
    // Exercise: toggle solve panel
    if (btn.dataset && btn.dataset.toggleSolve) {
        e.preventDefault();
        const panel = document.getElementById('solve-panel-' + btn.dataset.toggleSolve);
        if (panel) panel.classList.toggle('hidden');
        return;
    }
    // Exercise: submit derivation
    if (btn.dataset && btn.dataset.submitDerivation) {
        e.preventDefault();
        submitDerivationSolution(btn.dataset.submitDerivation);
        return;
    }
    // Exercise: submit direct answer
    if (btn.dataset && btn.dataset.submitDirect) {
        e.preventDefault();
        submitDirectAnswer(btn.dataset.submitDirect, btn.dataset.correct);
        return;
    }

    // Finish lesson button
    if (btn.dataset && btn.dataset.finishLesson) {
        e.preventDefault();
        if (typeof finishLesson === 'function') finishLesson(btn.dataset.finishLesson);
        return;
    }

    // Generic actions mapped by data-action
    if (btn.dataset && btn.dataset.action) {
        e.preventDefault();
        const act = btn.dataset.action;
        switch (act) {
            case 'handleLogin': if (typeof handleLogin === 'function') handleLogin(); break;
            case 'handleSignup': if (typeof handleSignup === 'function') handleSignup(); break;
            case 'handleDailyClaim': if (typeof handleDailyClaim === 'function') handleDailyClaim(); break;
            case 'processAndSaveVideo': if (typeof processAndSaveVideo === 'function') processAndSaveVideo(); break;
            case 'searchTopics': if (typeof searchTopics === 'function') searchTopics(); break;
            case 'handleQuickReactionEntry': if (typeof handleQuickReactionEntry === 'function') handleQuickReactionEntry(); break;
            case 'startQuickReactionGame': if (typeof startQuickReactionGame === 'function') startQuickReactionGame(); break;
            case 'closeExerciseModal': if (typeof closeExerciseModal === 'function') closeExerciseModal(); break;
            case 'hideAlert': if (typeof hideAlert === 'function') hideAlert(); break;
            case 'backToExerciseCategories': if (typeof backToExerciseCategories === 'function') backToExerciseCategories(); break;
            case 'toggleSiblingHidden': 
                // Toggle the next element's hidden class (for exercise tier dropdowns)
                if (btn.nextElementSibling) {
                    btn.nextElementSibling.classList.toggle('hidden');
                }
                break;
            case 'closeTopicView':
                if (typeof closeTopicView === 'function') closeTopicView();
                break;
            case 'exploreMore':
                if (btn.dataset.exploreTopic && typeof exploreMore === 'function') {
                    exploreMore(btn.dataset.exploreTopic);
                }
                break;
            case 'deleteVideo':
                if (btn.dataset.videoId && typeof deleteVideo === 'function') {
                    deleteVideo(parseInt(btn.dataset.videoId, 10));
                }
                break;
            case 'openLogoutDialog':
                if (typeof openLogoutDialog === 'function') openLogoutDialog();
                break;
            case 'processArcadeGuess':
                if (btn.dataset.arcadeOpt && btn.dataset.arcadeSubject && typeof processArcadeGuess === 'function') {
                    processArcadeGuess(btn.dataset.arcadeOpt, btn.dataset.arcadeSubject);
                }
                break;
            default:
                // Unknown action: try calling a global function by name
                if (typeof window[act] === 'function') window[act]();
        }
        return;
    }

    // Show auth page toggles (signup/login)
    if (btn.dataset && btn.dataset.showAuth) {
        e.preventDefault();
        if (typeof showAuthPage === 'function') showAuthPage(btn.dataset.showAuth);
        return;
    }

    // Toggle password visibility
    if (btn.dataset && btn.dataset.togglePassword) {
        e.preventDefault();
        togglePasswordVisibility(btn.dataset.togglePassword);
        return;
    }

    // Navigation via data-nav (optionally with tab id in data-nav-tab)
    if (btn.dataset && btn.dataset.nav) {
        e.preventDefault();
        const view = btn.dataset.nav;
        let tabEl = null;
        if (btn.dataset.navTab) tabEl = document.getElementById(btn.dataset.navTab);
        navigateTo(view, tabEl || btn);
        return;
    }

    // slide dots
    if (btn.dataset && btn.dataset.slide) {
        e.preventDefault();
        manualSlide(parseInt(btn.dataset.slide,10) || 0);
        return;
    }

    // Open subject from Ebooks
    if (btn.dataset && btn.dataset.openSubject) {
        e.preventDefault();
        if (typeof openSubject === 'function') openSubject(btn.dataset.openSubject);
        return;
    }

    // Select exercise category
    if (btn.dataset && btn.dataset.selectExercise) {
        e.preventDefault();
        if (typeof selectExerciseCategory === 'function') selectExerciseCategory(btn.dataset.selectExercise);
        return;
    }

    // Buy theme or item
    if (btn.dataset && btn.dataset.buyTheme) {
        e.preventDefault();
        const cost = parseInt(btn.dataset.cost,10) || 0;
        if (typeof handleThemeAction === 'function') handleThemeAction(btn.dataset.buyTheme, cost);
        return;
    }
    if (btn.dataset && btn.dataset.buyItem) {
        e.preventDefault();
        const cost = parseInt(btn.dataset.cost,10) || 0;
        if (typeof handleItemAction === 'function') handleItemAction(btn.dataset.buyItem, cost);
        return;
    }

    // Confirm logout modal buttons
    if (btn.dataset && typeof btn.dataset.confirmLogout !== 'undefined') {
        e.preventDefault();
        const val = String(btn.dataset.confirmLogout) === 'true';
        confirmLogout(val);
        return;
    }
});

// =========================================================================
// COORD-INTEGRATED 60-WORD ACADEMIC CROSSWORD SYSTEM DATABASE
// =========================================================================
const CROSSWORD_SUBJECTS_CONFIG = [
    { value: "Biology", label: "Biology" },
    { value: "EarthScience", label: "Earth Science" }
];

const CROSSWORD_DATABASE = {
    Biology: {
        "7": [
            { word: "CELL", num: 1, x: 0, y: 0, dir: "A", hint: "The fundamental structural unit of living things." },
            { word: "ORGANISM", num: 5, x: 4, y: 0, dir: "A", hint: "An individual living thing like a plant or animal." },
            { word: "TISSUE", num: 2, x: 3, y: 0, dir: "D", hint: "Group of similar cells working together." },
            { word: "ORGAN", num: 3, x: 0, y: 3, dir: "A", hint: "Structure of tissues working together (e.g. Heart)." },
            { word: "MICROSCOPE", num: 4, x: 1, y: 2, dir: "D", hint: "Optical instrument used to view tiny items." },
            { word: "PROKARYOTE", num: 6, x: 0, y: 5, dir: "A", hint: "Simple cell missing a distinct nucleus structure." },
            { word: "EUKARYOTE", num: 7, x: 2, y: 4, dir: "D", hint: "Complex cell containing a clear bound nucleus." },
            { word: "PLANT", num: 8, x: 0, y: 8, dir: "A", hint: "Multicellular organism producing food via sunlight." },
            { word: "ANIMAL", num: 9, x: 5, y: 6, dir: "D", hint: "Multicellular organism that must eat others for fuel." },
            { word: "BACTERIA", num: 10, x: 3, y: 11, dir: "A", hint: "Microscopic single-celled prokaryotic bugs." }
        ],
        "8": [
            { word: "DIGESTION", num: 1, x: 0, y: 1, dir: "A", hint: "Breaking down food into basic nutrients." },
            { word: "RESPIRATION", num: 2, x: 2, y: 0, dir: "D", hint: "Biochemical process releasing chemical energy." },
            { word: "OSMOSIS", num: 3, x: 0, y: 4, dir: "A", hint: "Diffusion of water across a membrane barrier." },
            { word: "ENZYME", num: 4, x: 5, y: 2, dir: "D", hint: "Protein catalyst speeding up metabolic operations." },
            { word: "CIRCULATION", num: 5, x: 0, y: 7, dir: "A", hint: "Movement of blood or fluid around body tracks." },
            { word: "BLOOD", num: 6, x: 1, y: 6, dir: "D", hint: "Fluid pumping through the heart and vessels." },
            { word: "HEART", num: 7, x: 6, y: 5, dir: "A", hint: "Muscular pump directing blood operations." },
            { word: "LUNGS", num: 8, x: 8, y: 4, dir: "D", hint: "Gas exchange respiratory organs for air breathing." },
            { word: "NUTRIENT", num: 9, x: 2, y: 10, dir: "A", hint: "Nourishment chemical vital for sustainable life." },
            { word: "EXCRETION", num: 10, x: 10, y: 2, dir: "D", hint: "Eliminating metabolic garbage from bodies." }
        ],
        "9": [
            { word: "NUCLEUS", num: 1, x: 0, y: 1, dir: "A", hint: "Control command center holding genetic DNA blocks." },
            { word: "MITOCHONDRIA", num: 2, x: 1, y: 0, dir: "D", hint: "Power houses producing cellular energy outputs." },
            { word: "CHLOROPLAST", num: 3, x: 0, y: 4, dir: "A", hint: "Plant organelle capture space where sunlight transforms." },
            { word: "PHOTOSYNTHESIS", num: 4, x: 3, y: 0, dir: "D", hint: "Light-driven method synthesizing sugar fuels." },
            { word: "MITOSIS", num: 5, x: 0, y: 7, dir: "A", hint: "Nuclear cell division split generating clones." },
            { word: "CHROMOSOME", num: 6, x: 5, y: 3, dir: "D", hint: "Thread structural array handling genetic links." },
            { word: "DNA", num: 7, x: 0, y: 10, dir: "A", hint: "Double helix containing instruction data patterns." },
            { word: "GENE", num: 8, x: 8, y: 6, dir: "D", hint: "Hereditary sequence code driving custom traits." },
            { word: "RIBOSOME", num: 9, x: 3, y: 9, dir: "A", hint: "Tiny engine assembling string amino structures." },
            { word: "CYTOPLASM", num: 10, x: 10, y: 1, dir: "D", hint: "Jelly filling inside cell boundary walls." }
        ]
    },
    EarthScience: {
        "7": [
            { word: "ATMOSPHERE", num: 1, x: 0, y: 1, dir: "A", hint: "Gaseous envelope protective shield surrounding worlds." },
            { word: "WEATHERING", num: 2, x: 2, y: 0, dir: "D", hint: "Breaking down surface rocks into dust matrices." },
            { word: "EROSION", num: 3, x: 0, y: 4, dir: "A", hint: "Moving loose surface fragments via wind or currents." },
            { word: "SEDIMENT", num: 4, x: 5, y: 2, dir: "D", hint: "Solid pieces layer settling out down in channels." },
            { word: "MINERAL", num: 5, x: 0, y: 7, dir: "A", hint: "Inorganic solid showing consistent crystal lines." },
            { word: "ROCK", num: 6, x: 0, y: 10, dir: "A", hint: "Solid mix composite formed out of crystal groupings." },
            { word: "IGNEOUS", num: 7, x: 7, y: 4, dir: "D", hint: "Fire rock cooled out of molten lava configurations." },
            { word: "MAGMA", num: 8, x: 4, y: 6, dir: "A", hint: "Liquid molten rock running under surface crust levels." },
            { word: "LAVA", num: 9, x: 9, y: 6, dir: "D", hint: "Molten stone vented up through crust fractures." },
            { word: "CRUST", num: 10, x: 1, y: 9, dir: "A", hint: "Outermost layer shell formatting planetary decks." }
        ],
        "8": [
            { word: "MANTLE", num: 1, x: 0, y: 1, dir: "A", hint: "Heavy internal hot rock segment under outer shells." },
            { word: "CORE", num: 2, x: 2, y: 0, dir: "D", hint: "Ultra dense central iron sphere of planetary systems." },
            { word: "EARTHQUAKE", num: 3, x: 0, y: 4, dir: "A", hint: "Violent tremor release from sliding fault friction." },
            { word: "VOLCANO", num: 4, x: 4, y: 2, dir: "D", hint: "Venting mountain mountain dynamic throwing fire ash." },
            { word: "PLATE", num: 5, x: 0, y: 7, dir: "A", hint: "Massive moving section puzzle chunk of lithosphere." },
            { word: "TSUNAMI", num: 6, x: 6, y: 5, dir: "D", hint: "Harbor wave series triggered by marine shifts." },
            { word: "FAULT", num: 7, x: 1, y: 9, dir: "A", hint: "Cracked displacement gap separating crust sections." },
            { word: "SEISMIC", num: 8, x: 8, y: 4, dir: "D", hint: "Vibrational energy wave running from structural hits." },
            { word: "FOSSIL", num: 9, x: 5, y: 11, dir: "A", hint: "Stone cast or track of ancient biological lifelines." },
            { word: "GEOLOGY", num: 10, x: 10, y: 0, dir: "D", hint: "Science charting physical history and shifts of stone." }
        ],
        "9": [
            { word: "METAMORPHIC", num: 1, x: 0, y: 1, dir: "A", hint: "Stone modified inside via pressure and deep cook shifts." },
            { word: "TECTONICS", num: 2, x: 2, y: 0, dir: "D", hint: "Structural study mapping crust dynamic plate drifting." },
            { word: "PANGEA", num: 3, x: 0, y: 4, dir: "A", hint: "Ancient massive supercontinent linking old shore maps." },
            { word: "GLACIER", num: 4, x: 5, y: 2, dir: "D", hint: "Enormous slow river of creeping frozen pack ice." },
            { word: "CYCLE", num: 5, x: 0, y: 7, dir: "A", hint: "Continuous systemic loop path shifting stone profiles." },
            { word: "CONVECTION", num: 6, x: 7, y: 1, dir: "D", hint: "Thermal flow drift driving interior mantle systems." },
            { word: "TRENCH", num: 7, x: 3, y: 9, dir: "A", hint: "Abyssal subduction slice valley carving sea floors." },
            { word: "SUBDUCTION", num: 8, x: 9, y: 0, dir: "D", hint: "Overriding action forcing plates down to core paths." },
            { word: "TOPOGRAPHY", num: 9, x: 0, y: 11, dir: "A", hint: "Surface terrain outline relief configurations maps." },
            { word: "BIOSPHERE", num: 10, x: 11, y: 2, dir: "D", hint: "Global zone network hosting all living life units." }
        ]
    }
};

// State Parameters
let cwActiveDataset = [];
let cwStopwatchInstance = null;
let cwSecondsElapsed = 0;
let cwActiveSelectedCell = null; 
let cwActiveClue = null;

function initCrosswordLobby() {
    const selectEl = document.getElementById('cw-subject-select');
    if (!selectEl) return;
    selectEl.innerHTML = CROSSWORD_SUBJECTS_CONFIG.map(sub => 
        `<option value="${sub.value}">${sub.label}</option>`
    ).join('');
}

function startCrosswordGame() {
    const selectEl = document.getElementById('cw-subject-select');
    if (selectEl && selectEl.options.length === 0) initCrosswordLobby();
    
    const subject = selectEl ? selectEl.value : "Biology";
    let studentGrade = "9"; 
    
    if (window.u && window.userDB && userDB[u] && userDB[u].grade) studentGrade = String(userDB[u].grade);
    else if (window.currentAccount && currentAccount.grade) studentGrade = String(currentAccount.grade);
    if (!["7", "8", "9"].includes(studentGrade)) studentGrade = "9";

    const subjectCategory = CROSSWORD_DATABASE[subject] || CROSSWORD_DATABASE["Biology"];
    cwActiveDataset = subjectCategory[studentGrade] || subjectCategory["9"];
    
    document.getElementById('cw-game-subject').innerText = `🧩 Crossword: ${subject} (Grade ${studentGrade})`;
    
    if (window.bottomNav) window.bottomNav.classList.add('hidden');
    const bNav = document.getElementById('bottom-nav');
    if (bNav) bNav.classList.add('hidden');
    
    // Timer Loop
    cwSecondsElapsed = 0;
    document.getElementById('cw-stopwatch').innerText = "00:00";
    clearInterval(cwStopwatchInstance);
    cwStopwatchInstance = setInterval(() => {
        cwSecondsElapsed++;
        const m = String(Math.floor(cwSecondsElapsed / 60)).padStart(2, '0');
        const s = String(cwSecondsElapsed % 60).padStart(2, '0');
        document.getElementById('cw-stopwatch').innerText = `${m}:${s}`;
    }, 1000);

    cwActiveSelectedCell = null;
    cwActiveClue = null;
    document.getElementById('cw-active-clue-text').innerText = "Select any grid square or clue item to begin.";

    buildCrosswordMatrixGrid();
    buildQWERTYKeyboard();
    
    if (typeof navigateTo === "function") {
        try { navigateTo('CrosswordGameView'); } catch(e) { forceDirectViewShow(); }
    } else {
        forceDirectViewShow();
    }
}

function buildCrosswordMatrixGrid() {
    const board = document.getElementById('crossword-matrix-board');
    const acrossBox = document.getElementById('cw-across-clues-container');
    const downBox = document.getElementById('cw-down-clues-container');
    
    board.innerHTML = "";
    acrossBox.innerHTML = "";
    downBox.innerHTML = "";

    const gridDim = 12;
    const cellMap = Array(gridDim).fill(null).map(() => Array(gridDim).fill(null));

    cwActiveDataset.forEach((item) => {
        let currentX = item.x;
        let currentY = item.y;
        
        for (let i = 0; i < item.word.length; i++) {
            if (currentX >= gridDim || currentY >= gridDim) break;
            
            if (!cellMap[currentY][currentX]) {
                cellMap[currentY][currentX] = {
                    letter: item.word[i],
                    numLabel: (i === 0) ? item.num : null,
                    cluesBelong: []
                };
            } else if (i === 0 && !cellMap[currentY][currentX].numLabel) {
                cellMap[currentY][currentX].numLabel = item.num;
            }
            
            cellMap[currentY][currentX].cluesBelong.push(item);
            
            if (item.dir === "A") currentX++;
            else currentY++;
        }
    });

    for (let r = 0; r < gridDim; r++) {
        for (let c = 0; c < gridDim; c++) {
            const data = cellMap[r][c];
            const cellDiv = document.createElement('div');
            
            if (!data) {
                cellDiv.className = "cw-cell black-cell";
            } else {
                cellDiv.className = "cw-cell white-cell";
                cellDiv.setAttribute('data-x', c);
                cellDiv.setAttribute('data-y', r);
                cellDiv.setAttribute('data-solution', data.letter);
                cellDiv.setAttribute('data-current', "");

                if (data.numLabel) {
                    const numTag = document.createElement('div');
                    numTag.className = "cw-cell-num";
                    numTag.innerText = data.numLabel;
                    cellDiv.appendChild(numTag);
                }

                const txtNode = document.createElement('div');
                txtNode.className = "cw-cell-input";
                cellDiv.appendChild(txtNode);

                cellDiv.onclick = () => handleCellSelection(cellDiv, data.cluesBelong[0]);
            }
            board.appendChild(cellDiv);
        }
    }

    cwActiveDataset.forEach(item => {
        const itemDiv = document.createElement('div');
        itemDiv.className = "cw-clue-item";
        itemDiv.setAttribute('id', `clue-${item.dir}-${item.num}`);
        itemDiv.innerHTML = `<strong>${item.num}.</strong> <span>${item.hint}</span>`;
        
        itemDiv.onclick = () => {
            highlightActiveClueTrack(item);
            const startCell = document.querySelector(`.cw-cell[data-x='${item.x}'][data-y='${item.y}']`);
            if (startCell) handleCellSelection(startCell, item);
        };

        if (item.dir === "A") acrossBox.appendChild(itemDiv);
        else downBox.appendChild(itemDiv);
    });
}

// NEW METHOD: COMPILING NATIVE VIRTUAL DRIVER RACK ELEMENTS
function buildQWERTYKeyboard() {
    const container = document.getElementById('cw-keyboard-container');
    if (!container) return;
    container.innerHTML = "";

    const qwertyRows = [
        ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
        ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
        ["Z", "X", "C", "V", "B", "N", "M", "⌫"]
    ];

    qwertyRows.forEach(rowKeys => {
        const rowDiv = document.createElement('div');
        rowDiv.style.display = "flex";
        rowDiv.style.gap = "5px";
        rowDiv.style.width = "100%";
        rowDiv.style.justifyContent = "center";

        rowKeys.forEach(keyText => {
            const btn = document.createElement('button');
            btn.className = "cw-key-cap";
            btn.innerText = keyText;
            
            // Inline Keyboard Styling Engine Matrix Rules
            Object.assign(btn.style, {
                background: keyText === "⌫" ? "#e74c3c" : "#34495e",
                color: "#ffffff",
                border: "none",
                borderRadius: "5px",
                padding: "12px 0",
                fontSize: "15px",
                fontWeight: "bold",
                cursor: "pointer",
                flex: keyText === "⌫" ? "1.5" : "1",
                minWidth: "28px",
                maxWidth: "50px",
                boxShadow: "0 3px 0 #1a252f",
                transition: "all 0.05s ease",
                textAlign: "center"
            });

            btn.onmousedown = () => {
                btn.style.transform = "translateY(2px)";
                btn.style.boxShadow = "0 1px 0 #1a252f";
            };

            btn.onmouseup = () => {
                btn.style.transform = "translateY(0px)";
                btn.style.boxShadow = "0 3px 0 #1a252f";
            };

            btn.onclick = (e) => {
                e.stopPropagation();
                handleKeyboardPress(keyText);
            };

            rowDiv.appendChild(btn);
        });

        container.appendChild(rowDiv);
    });
}

function handleCellSelection(cell, primaryClue) {
    document.querySelectorAll('.cw-cell').forEach(c => c.classList.remove('active-focus'));
    cell.classList.add('active-focus');
    cwActiveSelectedCell = cell;

    if (primaryClue) {
        highlightActiveClueTrack(primaryClue);
    }
}

function handleKeyboardPress(char) {
    if (!cwActiveSelectedCell) return;
    
    const inputDiv = cwActiveSelectedCell.querySelector('.cw-cell-input');
    if (!inputDiv) return;

    if (char === "⌫") {
        inputDiv.innerText = "";
        cwActiveSelectedCell.setAttribute('data-current', "");
    } else {
        inputDiv.innerText = char;
        cwActiveSelectedCell.setAttribute('data-current', char);
        
        // Auto-advance cursor logic to the next interlocking cell sequence
        advanceToNextGridSquare();
    }

    evaluateGridValidation();
}

function advanceToNextGridSquare() {
    if (!cwActiveClue || !cwActiveSelectedCell) return;

    let cx = parseInt(cwActiveSelectedCell.getAttribute('data-x'));
    let cy = parseInt(cwActiveSelectedCell.getAttribute('data-y'));

    if (cwActiveClue.dir === "A") cx++; else cy++;

    const nextCell = document.querySelector(`.cw-cell[data-x='${cx}'][data-y='${cy}']`);
    if (nextCell && nextCell.classList.contains('white-cell')) {
        document.querySelectorAll('.cw-cell').forEach(c => c.classList.remove('active-focus'));
        nextCell.classList.add('active-focus');
        cwActiveSelectedCell = nextCell;
    }
}

function highlightActiveClueTrack(clue) {
    cwActiveClue = clue;
    const tag = clue.dir === "A" ? "ACROSS" : "DOWN";
    document.getElementById('cw-active-clue-text').innerText = `(${clue.num} ${tag}): ${clue.hint}`;
    
    document.querySelectorAll('.cw-clue-item').forEach(i => i.classList.remove('active-clue-selection'));
    const currentItem = document.getElementById(`clue-${clue.dir}-${clue.num}`);
    if (currentItem) currentItem.classList.add('active-clue-selection');

    document.querySelectorAll('.cw-cell').forEach(c => c.classList.remove('word-highlight'));
    
    let cx = clue.x;
    let cy = clue.y;
    for (let i = 0; i < clue.word.length; i++) {
        const target = document.querySelector(`.cw-cell[data-x='${cx}'][data-y='${cy}']`);
        if (target) target.classList.add('word-highlight');
        if (clue.dir === "A") cx++; else cy++;
    }
}

function evaluateGridValidation() {
    const activeWhiteCells = document.querySelectorAll('.cw-cell.white-cell');
    let totalCorrectCells = 0;

    activeWhiteCells.forEach(cell => {
        const sol = cell.getAttribute('data-solution');
        const cur = cell.getAttribute('data-current');
        if (sol === cur) totalCorrectCells++;
    });

    if (totalCorrectCells === activeWhiteCells.length) {
        clearInterval(cwStopwatchInstance);
        activeWhiteCells.forEach(cell => cell.classList.add('correct-animate'));

        if (window.u && window.userDB && userDB[u]) {
            userDB[u].points = (userDB[u].points || 0) + 200;
            if (typeof saveAndSync === "function") saveAndSync();
        }

        setTimeout(() => {
            if (typeof showAlert === "function") {
                showAlert("🧩 Crossword Solved!", `Excellent work! Grid locked flawlessly in ${document.getElementById('cw-stopwatch').innerText}! Received +200 PTS.`, "success");
            } else {
                alert(`🧩 Crossword Solved! Complete time profile: ${document.getElementById('cw-stopwatch').innerText}! Earned 200 PTS.`);
            }
            exitCrosswordMatch();
        }, 500);
    }
}

function exitCrosswordMatch() {
    clearInterval(cwStopwatchInstance);
    if (window.bottomNav) window.bottomNav.classList.remove('hidden');
    const bNav = document.getElementById('bottom-nav');
    if (bNav) bNav.classList.remove('hidden');
    
    if (typeof navigateTo === "function") {
        navigateTo('vGames'); 
    } else {
        const view = document.getElementById('CrosswordGameView');
        if (view) view.classList.add('hidden');
    }
}

// System initializers hooks mapping structures
initCrosswordLobby();
document.addEventListener('DOMContentLoaded', initCrosswordLobby);

// Complete translation dictionary for NGS Yukunthor - LearningIsFun
const APP_TRANSLATION_DICTIONARY = {
    // Global & Headers
    "ngs yukunthor - learningisfun - beta v.1.0": "សាលារៀនជំនាន់ថ្មីព្រះយុគន្ធរ - ការសិក្សាពិតជាសប្បាយ - BETA v.1.0",
    "learningisfun - beta": "ការសិក្សាពិតជាសប្បាយ - BETA",
    "student": "សិស្ស",
    "username": "ឈ្មោះអ្នកប្រើប្រាស់",
    "password": "លេខកូដសម្ងាត់",
    "grade": "ថ្នាក់ទី",
    "rank": "ចំណាត់ថ្នាក់",
    "hours": "ម៉ោង",
    "novice": "អ្នកទើបចាប់ផ្តើម",

    // Authentication Layer (Login / Sign Up)
    "ngs login": "ចូលប្រព័ន្ធ NGS",
    "enter username": "វាយបញ្ចូលឈ្មោះអ្នកប្រើប្រាស់",
    "enter password": "វាយបញ្ចូលលេខកូដសម្ងាត់",
    "login": "ចូលប្រព័ន្ធ",
    "new student?": "សិស្សថ្មីមែនទេ?",
    "sign up": "ចុះឈ្មោះ",
    "create username": "បង្កើតឈ្មោះអ្នកប្រើប្រាស់",
    "create password": "បង្កើតលេខកូដសម្ងាត់",
    "gender": "ភេទ",
    "male": "ប្រុស",
    "female": "ស្រី",
    "select grade": "ជ្រើសរើសថ្នាក់",
    "grade 7": "ថ្នាក់ទី ៧",
    "grade 8": "ថ្នាក់ទី ៨",
    "grade 9": "ថ្នាក់ទី ៩",
    "create account": "បង្កើតគណនី",
    "back to": "ត្រឡប់ទៅ",

    // Home View Slider
    "enrollment 2026": "ការចុះឈ្មោះចូលរៀនឆ្នាំ ២០២៦",
    "unlock your potential at ngs preah yukunthor high school. the entrance exam starts soon.": "ពង្រីកសក្តានុពលរបស់អ្នកនៅវិទ្យាល័យសាលារៀនជំនាន់ថ្មី ព្រះយុគន្ធរ។ ការប្រឡងចូលរៀននឹងចាប់ផ្តើមឆាប់ៗនេះ។",
    "character quest": "បេសកកម្មតួអង្គ",
    "earn points to customize your avatar and theme!": "ស្វែងរកពិន្ទុដើម្បីផ្លាស់ប្តូររូបតំណាង និងប្រធានបទរបស់អ្នក!",
    "app in development": "កម្មវិធីកំពុងអភិវឌ្ឍន៍",
    "we are currently testing and running our app as much as possible. please report if there's bugs or errors. thank you!": "យើងកំពុងសាកល្បង និងដំណើរការកម្មវិធីរបស់យើងឱ្យអស់ពីលទ្ធភាព។ សូមរាយការណ៍មកយើងប្រសិនបើមានកំហុសឆ្គង។ សូមអរគុណ!",

    // Main Menu / Grid Items
    "avatar": "រូបតំណាង",
    "e-books (v1.0)": "សៀវភៅអេឡិចត្រូនិច (v1.0)",
    "exercises (v1.0)": "លំហាត់អនុវត្ត (v1.0)",
    "quiz (work in progress)": "កម្រងសំណួរ (កំពុងរៀបចំ)",
    "fun games (work in progress)": "ហ្គេមកំសាន្ត (កំពុងរៀបចំ)",

    // Settings Menu
    "menu": "មីនុយ",
    "point shop": "ហាងប្តូរពិន្ទុ",
    "exchange points for themes and items": "ប្តូរពិន្ទុសម្រាប់ប្រធានបទ និងសម្ភារៈផ្សេងៗ",
    "notifications": "ការជូនដំណឹង",
    "stay updated on new assignments": "ទទួលបានព័ត៌មានថ្មីៗអំពីកិច្ចការសាលា",
    "logout": "ចាកចេញ",
    "exit your current session": "ចាកចេញពីគណនីរបស់អ្នក",

    // Point Shop Items
    "back to settings": "ត្រឡប់ទៅកាន់ការកំណត់",
    "crimson void": "ដែនដីក្រហមឆ្អៅ",
    "cost: 500 points": "តម្លៃ៖ ៥០០ ពិន្ទុ",
    "buy theme": "ទិញប្រធានបទ",
    "mystical golden aura": "ពន្លឺមន្តអាគមពណ៌មាស",
    "buy aura": "ទិញពន្លឺ aura",
    "custom cursor": "ទស្សន៍ទ្រនិចពិសេស",
    "cost: 1000 points": "តម្លៃ៖ ១០០០ ពិន្ទុ",
    "buy cursor": "ទិញទស្សន៍ទ្រនិច",
    "daily bonus": "ប្រាក់រង្វាន់ប្រចាំថ្ងៃ",
    "loading timer": "កំពុងដំណើរការកម្មវិធីកំណត់ម៉ោង",
    "claim 100 pts": "ទទួលបាន ១០០ ពិន្ទុ",

    // All About Us
    "all about us": "អំពីយើងទាំងអស់គ្នា",
    "our vision & mission": "ចក្ខុវិស័យ និងបេសកកម្មរបស់យើង",
    "we are dedicated to building interactive, high-performance web systems and gaming simulators. by combining elegant styling matrices with robust programmatic engines, we deliver exceptional software solutions. we make learning enjoyable again!": "យើងប្តេជ្ញាចិត្តក្នុងការបង្កើតប្រព័ន្ធគេហទំព័រដែលមានអន្តរកម្ម ប្រសិទ្ធភាពខ្ពស់ និងកម្មវិធីត្រាប់តាមហ្គេម។ ដោយការរួមបញ្ចូលគ្នានូវរចនាស្ទីលដ៏ស្រស់ស្អាតជាមួយនឹងកូដដ៏រឹងមាំ យើងផ្តល់ជូននូវដំណោះស្រាយកម្មវិធីដ៏ល្អឥតខ្ចោះ។ យើងធ្វើឱ្យការរៀនសូត្រក្លាយជារឿងសប្បាយរីករាយម្តងទៀត!",
    "our team": "ក្រុមការងាររបស់យើង",
    "programmer / developer": "អ្នកសរសេរកម្មវិធី / អ្នកអភិវឌ្ឍន៍",
    "developed most of the working systems. brought ideas into code (mostly). lacks sleep from it.": "អ្នកបង្កើតប្រព័ន្ធដំណើរការភាគច្រើន។ បំប្លែងគំនិតទៅជាកូដ (ភាគច្រើន)។ មិនសូវបានគេងដោយសារវា។",
    "graphics and theme designer": "អ្នករចនាក្រាហ្វិក និងប្រធានបទ",
    "helps design the themes. bug fixes and error patcher. the posters are his work of art.": "ជួយរចនាប្រធានបទផ្សេងៗ។ កែសម្រួលប្រព័ន្ធ និងដោះស្រាយបញ្ហាកូដ។ ផ្ទាំងរូបភាពផ្សព្វផ្សាយគឺជាស្នាដៃសិល្បៈរបស់គាត់។",
    "brainstormer and editor": "អ្នកបង្កើតគំនិត និងអ្នកកែសម្រួល",
    "brought up the ideas. brainstorms the solutions. navigated bugs and errors.": "អ្នកផ្តួចផ្តើមគំនិត។ ស្វែងរកដំណោះស្រាយ និងតាមដានរាល់បញ្ហាកូដផ្សេងៗ។",
    "⚡ operational pillars": "⚡ សសរស្តម្ភប្រតិបត្តិការ",
    "performance matrix": "រចនាសម្ព័ន្ធប្រសិទ្ធភាព",
    "optimizing scripts for sub-millisecond execution loops and fast renders.": "បង្កើនប្រសិទ្ធភាពកូដសម្រាប់ការដំណើរការលឿនបំផុត និងការបង្ហាញរហ័ស។",
    "fluid interactivity": "អន្តរកម្មរលូន",
    "replacing standard static controls with real-time responsive gaming assets.": "ជំនួសការគ្រប់គ្រងឋិតិវន្តស្តង់ដារជាមួយធនធានហ្គេមដែលឆ្លើយតបភ្លាមៗ។",
    "data consistency": "ភាពស៊ីសង្វាក់គ្នានៃទិន្នន័យ",
    "preserving player states, currency shop inventory, and cooldown logs securely.": "រក្សាទុកស្ថានភាពអ្នកលេង បញ្ជីសារពើភណ្ឌហាង និងកំណត់ហេតុ cooldown ដោយសុវត្ថិភាព។",

    // Online Library / Smart Library
    "online library (beta)": "បណ្ណាល័យអនឡាញ (BETA)",
    "paste link to save video": "ចម្លងតំណភ្ជាប់ទីនេះដើម្បីរក្សាទុកវីដេអូ",
    "paste youtube link here...": "ចម្លងតំណភ្ជាប់ YouTube ដាក់ទីនេះ...",
    "video title (e.g. math lesson 1)": "ចំណងជើងវីដេអូ (ឧទាហរណ៍៖ មេរៀនគណិតវិទ្យា ទី១)",
    "fetch & save video": "ទាញយក និងរក្សាទុកវីដេអូ",
    "back to library": "ត្រឡប់ទៅបណ្ណាល័យ",
    "reading...": "កំពុងអាន...",
    "smart library": "បណ្ណាល័យវៃឆ្លាត",
    "search topics...": "ស្វែងរកប្រធានបទ...",
    "mathematics": "គណិតវិទ្យា",
    "math": "គណិតវិទ្យា",
    "physics": "រូបវិទ្យា",
    "chemistry": "គីមីវិទ្យា",
    "biology": "ជីវវិទ្យា",
    "earth science": "ផែនដីវិទ្យា",
    "back to subjects": "ត្រឡប់ទៅមុខវិជ្ជា",

    // Quiz & Exercises
    "back": "ត្រឡប់ក្រោយ",
    "*complete a lesson in ebooks to unlock 2 true/false questions.*": "*សូមបញ្ចប់មេរៀននៅក្នុងសៀវភៅអេឡិចត្រូនិច ដើម្បីបើកសំណួរ ពិត/មិនពិត ចំនួន២។*",
    "student exercises": "លំហាត់អនុវត្តសម្រាប់សិស្ស",
    "choose category to explore structured files": "ជ្រើសរើសប្រភេទមុខវិជ្ជាដើម្បីស្វែងរកឯកសារ",
    "← back to categories": "← ត្រឡប់ទៅកាន់ផ្នែកផ្សេងៗ",

    // Arcade & Games
    "🕹️ academic arcade": "🕹️ កន្លែងហ្គេមសិក្សា",
    "test your knowledge, beat the clock, and earn wallet point rewards!": "សាកល្បងចំណេះដឹងរបស់អ្នក ប្រកួតជាមួយពេលវេលា និងឈ្នះរង្វាន់ពិន្ទុ!",
    "⚡ quick reaction": "⚡ ប្រតិកម្មរហ័ស",
    "perfect for calculating disciplines like math, chemistry, and physics. solve rapid-fire multiple-choice problems before time expires!": "ល្អឥតខ្ចោះសម្រាប់ការគណនាដូចជា គណិតវិទ្យា គីមីវិទ្យា និងរូបវិទ្យា។ ដោះស្រាយលំហាត់ពហុជ្រើសរើសលឿនៗមុនពេលអស់ពេល!",
    "enter (beta)": "ចូលរួម (BETA)",
    "🧩 crosswords": "🧩 ហ្គេមផ្គូផ្គងពាក្យ",
    "tailored for descriptive modules. drag or click letters to match vocabulary words with scientific definitions.": "រៀបចំឡើងសម្រាប់មេរៀនពិពណ៌នា។ អូស ឬចុចអក្សរដើម្បីផ្គូផ្គងពាក្យជាមួយនិយមន័យវិទ្យាសាស្ត្រ។",
    "select subject:": "ជ្រើសរើសមុខវិជ្ជា៖",
    "play now": "លេងឥឡូវនេះ",
    "← back to arcade": "← ត្រឡប់ទៅកាន់កន្លែងហ្គេម",
    "setup arena parameters": "រៀបចំប៉ារ៉ាម៉ែត្រទីលានប្រកួត",
    "1. select subject:": "១. ជ្រើសរើសមុខវិជ្ជា៖",
    "2. select difficulty:": "២. ជ្រើសរើសកម្រិតលំបាក៖",
    "easy (5 pts / correct)": "ងាយស្រួល (៥ ពិន្ទុ / ចម្លើយត្រឹមត្រូវ)",
    "medium (25 pts / correct)": "មធ្យម (២៥ ពិន្ទុ / ចម្លើយត្រឹមត្រូវ)",
    "hard (100 pts / correct)": "លំបាក (១០០ ពិន្ទុ / ចម្លើយត្រឹមត្រូវ)",
    "3. select time limit:": "៣. ជ្រើសរើសកំណត់ពេលវេលា៖",
    "30 seconds": "៣០ វិនាទី",
    "60 seconds": "៦០ វិនាទី",
    "90 seconds": "៩០ វិនាទី",
    "start game⚡": "ចាប់ផ្តើមហ្គេម⚡",

    // Active Game Interface
    "time left:": "ពេលវេលានៅសល់៖",
    "session record:": "កំណត់ត្រាប្រកួត៖",
    "pts": "ពិន្ទុ",
    "⚠️ incorrect answer, penalty applied! system locked for": "⚠️ ចម្លើយមិនត្រឹមត្រូវទេ ពិន័យត្រូវបានអនុវត្ត! ប្រព័ន្ធផ្អាកដំណើរការរយៈពេល",
    "s...": "វិនាទី...",
    "generating problem node...": "កំពុងបង្កើតប្រភពលំហាត់...",
    "category: loading...": "ប្រភេទ៖ កំពុងដំណើរការ...",
    "🏳️ leave": "🏳️ ចាកចេញ",
    "select any box grid square or clue item to begin.": "ជ្រើសរើសប្រអប់ក្រឡាចត្រង្គ ឬតម្រុយណាមួយដើម្បីចាប់ផ្តើម។",
    "clues": "តម្រុយ"
};

// Create a safe inverted English dictionary map
const APP_ENGLISH_DICTIONARY = {};
Object.keys(APP_TRANSLATION_DICTIONARY).forEach(engKey => {
    APP_ENGLISH_DICTIONARY[APP_TRANSLATION_DICTIONARY[engKey]] = engKey;
});

/**
 * Tree Walker Engine to dynamically translate text contents and input properties
 */
function translateDOMBranch(node, targetLanguage) {
    // 1. Process Raw Text Nodes
    if (node.nodeType === Node.TEXT_NODE) {
        let cleanText = node.nodeValue.trim().toLowerCase();
        
        if (targetLanguage === "kh") {
            if (APP_TRANSLATION_DICTIONARY[cleanText]) {
                node.nodeValue = APP_TRANSLATION_DICTIONARY[cleanText];
            }
        } else if (targetLanguage === "en") {
            if (APP_ENGLISH_DICTIONARY[node.nodeValue.trim()]) {
                node.nodeValue = APP_ENGLISH_DICTIONARY[node.nodeValue.trim()];
            }
        }
    } 
    // 2. Process Input Field Placeholders
    else if (node.nodeType === Node.ELEMENT_NODE) {
        if (node.tagName === "INPUT" && node.hasAttribute("placeholder")) {
            let placeholderText = node.getAttribute("placeholder").trim().toLowerCase();
            
            if (targetLanguage === "kh") {
                if (APP_TRANSLATION_DICTIONARY[placeholderText]) {
                    node.setAttribute("data-orig-placeholder", node.getAttribute("placeholder"));
                    node.setAttribute("placeholder", APP_TRANSLATION_DICTIONARY[placeholderText]);
                }
            } else if (targetLanguage === "en") {
                if (node.hasAttribute("data-orig-placeholder")) {
                    node.setAttribute("placeholder", node.getAttribute("data-orig-placeholder"));
                }
            }
        }

        // Recursively walk downward bypassing script layers
        if (node.tagName !== 'SCRIPT' && node.tagName !== 'STYLE' && node.tagName !== 'TEXTAREA') {
            for (let i = 0; i < node.childNodes.length; i++) {
                translateDOMBranch(node.childNodes[i], targetLanguage);
            }
        }
    }
}

/**
 * Connected Event Hook triggered by the dropdown select change
 */
function toggleAppLanguage(langCode) {
    // Translate starting from the highest body block
    translateDOMBranch(document.body, langCode);
    
    // Optional Document Title Page Translation Update
    if (langCode === "kh") {
        document.title = "សាលារៀនជំនាន់ថ្មីព្រះយុគន្ធរ - LearningIsFun";
    } else {
        document.title = "NGS Yukunthor - LearningIsFun - BETA v.1.0";
    }
}