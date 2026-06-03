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

    // 1. Calculate the final amount
    // If reason is "Daily", we ensure it's exactly 100
    let finalAmount = (reason === "Daily") ? 0 : amount;
    
    // 2. Add ONLY to the userDB object
    userDB[u].points += finalAmount;

    // 3. Save everything and update the screen
    saveAndSync(); 
    
    // 4. Feedback
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
    
    if (viewId === 'vQuiz') {
        quiz_var.classList.remove('hidden')
    } else {
        quiz_var.classList.add('hidden')
    }

    const activePanel = document.getElementById(`${viewId}View`);
    if (activePanel) activePanel.classList.remove('hidden');

    const game_var = document.getElementById('vGames')

    if (viewId === 'vGames') {
        game_var.classList.remove('hidden')
    } else {
        game_var.classList.add('hidden')
    }

    const lobby_view = document.getElementById('QuickReactionLobbyView')

    if (viewId === 'QuickReactionLobbyView') {
        lobby_view.classList.remove('hidden')
    } else {
        lobby_view.classList.add('hidden')
    }

    const startgame_view = document.getElementById('QuickReactionGameView')

    if (viewId === 'QuickReactionGameView') {
        startgame_view.classList.remove('hidden')
    } else {
        startgame_view.classList.add('hidden')
    }
    
    // Clear intervals if navigating away from game rooms unexpectedly
    if (viewId === 'QuickReactionGameView') {
        clearInterval(qrTimerInstance);
        qrIsFrozen = false;
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
    } else { showAlert("Invalid credentials!"); }
}

 
// 5. SMART LIBRARY & CRAWLER (RESTORED)
 
function openSubject(subject) {
    const topics = knowledgeBase[subject]?.[userDB[u].grade] || [];
    document.getElementById('subjectLibrary').classList.add('hidden');
    document.getElementById('topicView').classList.remove('hidden');
    document.getElementById('activeSubjectDisplay').innerText = `${subject} (Grade ${userDB[u].grade})`;
    renderTopics(topics);
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
                <button onclick="triggerCrawler('${t}')">LEARN</button>
            </div>
        `).join('');
    }
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
                    onclick="exploreMore('${topic.replace(/'/g, "\\'")}')">
                    🔍 EXPLORE MORE
                </button>

                <div style="text-align:center; padding: 40px 20px;">
                    <button class="btn-primary" 
                            style="width: 100%; max-width: 300px; padding: 15px; border-radius: 50px; background: var(--accent); color: #000; font-weight: 800; cursor: pointer; border: none;"
                            onclick="finishLesson()">
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
function finishLesson(topicName, topic) {
    addPoints(50, `Completed ${topicName}`); // Adds the 50 points
    showAlert(`Lesson Complete! You earned 50 Study Points.`);
    navigateTo('vEbooks'); // Send them back to the library
    `QuizAI.generate(topic);`
}

function openSubject(subject) {
    const userGrade = userDB[u].grade;
    const topics = knowledgeBase[subject]?.[userGrade] || [];
    
    // Ensure the library containers toggle correctly
    const lib = document.getElementById('subjectLibrary');
    const tv = document.getElementById('topicView');
    
    if (lib) lib.classList.add('hidden');
    if (tv) tv.classList.remove('hidden');
    
    const display = document.getElementById('activeSubjectDisplay');
    if (display) display.innerText = `${subject} - Grade ${userGrade}`;
    
    renderTopics(topics);
}


// 6. SHOP & VISUALS
 
function handleItemAction(itemId, cost) {
    let user = userDB[u];
    if (user.inventory.includes(itemId)) {
        user.equippedItem = (user.equippedItem === itemId) ? null : itemId;
    } else if (Number(user.points) >= Number(cost)) {
        user.points -= cost;
        user.inventory.push(itemId);
        user.equippedItem = itemId;
        triggerPointAnim(cost, true);
    } else return showAlert("Not enough points!");
    saveAndSync();
}

`function handleGlowAction(glowId, cost) {
    let user = userDB[u];
    if (user.inventory.includes(glowId)) {
        user.activeGlow = (user.activeGlow === glowId) ? null : glowId;
    } else if (Number(user.points) >= Number(cost)) {
        user.points -= cost;
        user.inventory.push(glowId);
        user.activeGlow = glowId;
        triggerPointAnim(cost, true);
    } else return showAlert("Not enough points!");
    saveAndSync();
}`

function handleThemeAction(themeId, cost) {
    let user = userDB[u];
    if (user.unlockedThemes.includes(themeId)) {
        user.activeTheme = (user.activeTheme === themeId) ? 'default' : themeId;
    } else if (Number(user.points) >= Number(cost)) {
        user.points -= cost;
        user.unlockedThemes.push(themeId);
        user.activeTheme = themeId;
        triggerPointAnim(cost, true);
    } else return showAlert("Not enough points!");
    saveAndSync();
}

function refreshShopButtons() {
    const user = userDB[u];
    ['crown', 'gold_glow', 'blue_glow', 'red_theme'].forEach(id => {
        const btn = document.getElementById(`btn-${id}`);
        if (!btn) return;
        const owned = user.inventory.includes(id) || user.unlockedThemes.includes(id);
        if (!owned) btn.innerText = "Buy";
        else btn.innerText = (user.equippedItem === id || user.activeTheme === id || user.activeGlow === id) ? "Unequip" : "Equip";
    });
}

function updateVisuals() {
    const user = userDB[u];
    const crown = document.getElementById('charEffect');
    const avatar = document.getElementById('user-avatar');
    if (crown) (user.equippedItem === 'crown') ? crown.classList.remove('hidden') : crown.classList.add('hidden');
    if (avatar) {
        avatar.classList.remove('gold_glow-active', 'blue_glow-active');
        if (user.activeGlow) avatar.classList.add(user.activeGlow + "-active");
    }
}

function updateAvatarGender() {
    const charBase = document.getElementById('charBase');
    if (charBase && userDB[u]) charBase.src = (userDB[u].gender === 'female') ? "woman.png" : "man.png";
}

function applyTheme(themeId) {
    const root = document.documentElement;
    if (themeId === 'red_theme') {
        root.style.setProperty('--primary', '#ff4d4d');
        root.style.setProperty('--bg-grad', 'linear-gradient(180deg, #4d0000 0%, #000 100%)');
    } else {
        root.style.setProperty('--primary', '#00d4ff');
        root.style.setProperty('--bg-grad', 'linear-gradient(180deg, #1a1a2e 0%, #000 100%)');
    }
}

 
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

function handleLogout(isConfirmed) {
    const modal = document.getElementById('logoutModal');
    modal.classList.add('hidden');
    
    if (isConfirmed) {
        // Your actual logout logic
        localStorage.clear();
        window.location.reload(); 
    }
}

function calculateRank(pts) { return pts >= 1200 ? "Master Scholar" : (pts >= 600 ? "Elite Student" : "Novice"); }

 
// 9. SLIDER LOGIC (FIXED)
 
function manualSlide(index) {
    slideIndex = index;
    const track = document.getElementById('sliderTrack');
    const dots = document.querySelectorAll('.slider-dot'); // Targets your dot elements
    
    if (track) {
        track.style.transform = `translateX(-${index * 100}%)`;
    }
    
    // Update active dot visual state
    dots.forEach((dot, i) => {
        dot.classList.toggle('active', i === index);
    });
}

// Auto-slide interval (stored in a variable so it stays consistent)

 
// 8. INITIALIZATION
 
window.onload = () => { if (u) syncAppState(); };
for (let i = 1; i < 1000; i++) { clearInterval(i); }

// 2. Start the "Safe-Mode" Interval
setInterval(() => {
    // Check if user is logged in
    if (typeof u === 'undefined' || !userDB[u]) return;

    // Check if we are on the page with the daily reward
    const btn = document.getElementById('dailyBtn');
    const timer = document.getElementById('claimTimer');

    if (btn && timer) {
        const last = userDB[u].lastClaim || 0;
        const diff = Date.now() - last;
        const remaining = 86400000 - diff;

        if (remaining <= 0) {
            btn.disabled = false;
            timer.innerText = "Ready!";
        } else {
            btn.disabled = true;
            const h = Math.floor(remaining / 3600000);
            const m = Math.floor((remaining % 3600000) / 60000);
            const s = Math.floor((remaining % 60000) / 1000);
            timer.innerText = `${h}h ${m}m ${s}s`;
        }
    }
}, 1000);
setInterval(() => { slideIndex = (slideIndex === 0) ? 1 : 0; manualSlide(slideIndex); }, 6000);

 
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
    document.querySelectorAll('button').forEach(btn => {
        if (btn.innerText.trim() === "LEARN" && !btn.dataset.active) {
            
            // Apply the Shop Style you wanted
            btn.style.all = "unset";
            btn.style.cursor = "pointer";
            btn.style.padding = "6px 12px";
            btn.style.borderRadius = "6px";
            btn.style.backgroundColor = "rgba(255,255,255,0.1)";
            btn.style.border = "1px solid var(--border)";
            btn.style.fontSize = "10px";
            btn.style.fontWeight = "bold";
            btn.style.transition = "0.2s";
            btn.style.width = "100px";
            btn.style.alignSelf = "center";
            
            // Get the topic name from the text immediately above the button
            const topic = btn.parentElement.innerText.split('\n')[0].trim();
            
            btn.onclick = () => triggerCrawler(topic);
            btn.dataset.active = "true";
        }
    });
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
const finalObserver = new MutationObserver(() => {
    if (typeof setupAllLearnButtons === 'function') {
        setupAllLearnButtons();
    }
});

// Only start observing if the body exists
if (document.body) {
    finalObserver.observe(document.body, { childList: true, subtree: true });
}

function injectLogoutUI() {
    // 1. Create the CSS
    const style = document.createElement('style');
    style.innerHTML = `
        #logoutModal {
            position: fixed;
            top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.85);
            backdrop-filter: blur(10px);
            display: flex; align-items: center; justify-content: center;
            z-index: 9999; transition: 0.3s;
        }
        .logout-box {
            background: #1a1a2e;
            padding: 30px;
            border-radius: 20px;
            border: 1px solid var(--primary);
            text-align: center;
            width: 90%; max-width: 350px;
            box-shadow: 0 0 30px rgba(0, 212, 255, 0.2);
        }
        .logout-box h2 { color: white; margin-bottom: 10px; }
        .logout-box p { color: rgba(255,255,255,0.7); margin-bottom: 25px; }
        .logout-btn-group { display: flex; gap: 10px; justify-content: center; }
        .btn-logout { 
            padding: 10px 25px; border-radius: 10px; border: none; cursor: pointer; font-weight: bold; 
        }
        .btn-confirm { background: #ff4d4d; color: white; }
        .btn-cancel { background: rgba(255,255,255,0.1); color: white; }
        .hidden { display: none !important; }
    `;
    document.head.appendChild(style);

    // 2. Create the HTML Structure
    const modal = document.createElement('div');
    modal.id = 'logoutModal';
    modal.className = 'hidden';
    modal.innerHTML = `
    <div id="logoutModal" class="hidden">
        <div class="logout-box">
            <h2>Are you sure you want to logout?</h2>
            <div class="logout-btn-group">
                <button class="btn-confirm" onclick="confirmLogout()">Yes</button>
                <button class="btn-cancel" onclick="closeLogoutModal()">No</button>
            </div>
        </div>
    </div>
    `;
    document.body.appendChild(modal);
}

// Run the injection as soon as the script loads
injectLogoutUI();

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
                    <button onclick="deleteVideo(${item.id})" style="background:none; border:none; color:#ff4d4d; cursor:pointer;">
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

function renderExerciseTiers(subject) {
    const container = document.getElementById('tiersContainer');
    const tiers = exerciseDatabase[subject] || {};
    
    if (Object.keys(tiers).length === 0) {
        container.innerHTML = `<p style="opacity: 0.5; text-align: center;">No exercises recorded for this category yet.</p>`;
        return;
    }

    container.innerHTML = Object.keys(tiers).map(tierName => `
        <div class="tier-group">
            <div class="tier-header" onclick="this.nextElementSibling.classList.toggle('hidden')">
                <span>📁 ${tierName}</span>
                <span style="font-size: 0.8rem; opacity: 0.5;">▼</span>
            </div>
            <div class="tier-content hidden">
                ${tiers[tierName].map(ex => renderSingleCard(ex, subject)).join('')}
            </div>
        </div>
    `).join('');
}

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
                        <button class="ex-btn ex-btn-accent" id="submit-btn-${ex.id}" style="width: 100%; padding: 12px; font-weight: 800;" ${isCompleted ? 'disabled style="opacity: 0.3; cursor: not-allowed;"' : ''} onclick="submitDerivationSolution('${ex.id}')">
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
                        <button class="ex-btn ex-btn-accent" id="submit-btn-${ex.id}" style="width: 100%; padding: 12px; font-weight: 800;" ${isCompleted ? 'disabled style="opacity: 0.3; cursor: not-allowed;"' : ''} onclick="submitDirectAnswer('${ex.id}', '${btoa(ex.ans)}')">
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
                    <button class="ex-btn ex-btn-secondary" id="reveal-btn-${ex.id}" style="padding: 12px;" onclick="toggleExerciseSolution('${ex.id}', ${isSpecialCategory})">
                        ${isUnlocked ? (isVisible ? 'Hide Solution' : (isSpecialCategory ? 'Show Answer' : 'Show Solution')) : (isSpecialCategory ? 'Show Answer (-100 PTS)' : 'Show Solution (-100 PTS)')}
                    </button>
                    
                    <button class="ex-btn ex-btn-accent" style="padding: 12px;" onclick="document.getElementById('solve-panel-${ex.id}').classList.toggle('hidden')">
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
    if (window.u && window.userDB && userDB[u] && userDB[u].grade) {
        return String(userDB[u].grade);
    }
    return `${(userDB[u].grade)}`;
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
            <div class="tier-header" onclick="this.nextElementSibling.classList.toggle('hidden')">
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
        
        // Construct dynamic choice modal via prompt confirmation layers
        const choice = showAlert(`🔒 SYSTEM COOLDOWN ACTIVE\nYou must wait ${remainingMinutes} more minutes to access the simulator for free.\n\nAlternatively, you can pay 150 PTS to bypass this restriction instantly.\n\nDo you want to spend 150 PTS?`);
        
        if (choice) {
            const currentPoints = userDB[u].points || 0;
            if (currentPoints < 150) {
                showAlert(`Transaction Declined!<br><span style='font-size:0.8rem; opacity:0.7;'>You only possess <b>${currentPoints} PTS</b>. This bypass requires 150 PTS.</span>`);
                return;
            }
            
            // Deduct Points
            userDB[u].points -= 150;
            if (typeof triggerPointAnim === 'function') triggerPointAnim(150, true);
            saveAndSync();
            
            // Bypass granted
            navigateTo('QuickReactionLobbyView');
        }
    } else {
        // Cooldown clean, pass through safely
        navigateTo('QuickReactionLobbyView');
    }
}

// 2. RUNTIME SIMULATOR INITIALIZATION TRIPPERS
function startQuickReactionGame() {
    const selectedSubject = document.getElementById('qr-subject-select').value;
    const selectedDuration = parseInt(document.getElementById('qr-time-select').value, 10);
    
    // Initialize Memory Coordinates
    qrTimeRemaining = selectedDuration;
    qrRunningPointsEarned = 0;
    qrIsFrozen = false;
    
    document.getElementById('qr-timer-display').innerText = qrTimeRemaining;
    document.getElementById('qr-running-score').innerText = qrRunningPointsEarned;
    document.getElementById('qr-freeze-banner').classList.add('hidden');
    
    // Stamp account activity logs to trip cooldown triggers
    userDB[u].qrLastPlayedTimestamp = Date.now();
    saveAndSync();
    
    navigateTo('QuickReactionGame');
    injectNextArcadeQuestion(selectedSubject);
    
    // Fire Processing Heartbeat Clock
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

// 3. RAPID QUESTION GENERATOR (MATH / PHYSICS / CHEMISTRY CONTEXT POOLS)
// 3. ERROR-PROOF MULTI-GRADE QUESTION GENERATOR (MATH / PHYSICS / CHEMISTRY)
function injectNextArcadeQuestion(subject) {
    let questionText = "";
    let optionsArray = [];
    
    // Attempt to safely extract the student's grade level if available
    let studentGrade = "9"; // Default fallback so the game never breaks
    if (window.u && window.userDB && userDB[u] && userDB[u].grade) {
        studentGrade = String(userDB[u].grade);
    } else if (window.currentAccount && currentAccount.grade) {
        studentGrade = String(currentAccount.grade);
    }

    // ==========================================
    // SUBJECT MATRIX: MATH
    // ==========================================
    if (subject === "Math") {
        if (studentGrade === "7") {
            // Grade 7: Basic Linear Equations (e.g., 3x = 12 or x + 5 = 11)
            const xVal = Math.floor(Math.random() * 8) + 2; // Solution between 2 and 9
            const coeff = Math.floor(Math.random() * 5) + 2; // Coefficient between 2 and 6
            questionText = `Grade 7 Math: Solve for x: ${coeff}x = ${coeff * xVal}`;
            qrActiveCorrectAnswer = String(xVal);
            optionsArray = [qrActiveCorrectAnswer, String(xVal + 3), String(xVal - 1), String(xVal * 2)];
        } 
        else if (studentGrade === "8") {
            // Grade 8: Pythagorean Triples (Finding Hypotenuse 'c')
            const triples = [
                {a: 3, b: 4, c: 5},
                {a: 6, b: 8, c: 10},
                {a: 5, b: 12, c: 13}
            ];
            const chosen = triples[Math.floor(Math.random() * triples.length)];
            questionText = `Grade 8 Math: A right triangle has legs measuring ${chosen.a}cm and ${chosen.b}cm. Find the hypotenuse (c).`;
            qrActiveCorrectAnswer = `${chosen.c}cm`;
            optionsArray = [qrActiveCorrectAnswer, `${chosen.c + 2}cm`, `${chosen.a + chosen.b}cm`, `${chosen.c - 2}cm`];
        } 
        else {
            // Grade 9: Simple Factoring / Roots (x² - 5x + 6 = 0 -> roots are 2 and 3)
            const roots = [
                {r1: 2, r2: 3, text: "x² - 5x + 6 = 0"},
                {r1: 1, r2: 5, text: "x² - 6x + 5 = 0"},
                {r1: 3, r2: 4, text: "x² - 7x + 12 = 0"}
            ];
            const chosen = roots[Math.floor(Math.random() * roots.length)];
            questionText = `Grade 9 Math: Find one of the correct roots for: ${chosen.text}`;
            qrActiveCorrectAnswer = String(chosen.r1);
            optionsArray = [qrActiveCorrectAnswer, String(chosen.r2 + 3), "0", "-2"];
        }
    } 
    // ==========================================
    // SUBJECT MATRIX: PHYSICS
    // ==========================================
    else if (subject === "Physics") {
        if (studentGrade === "7" || studentGrade === "8") {
            // Grade 7/8: Uniform Speed (v = d / t)
            const distance = [40, 60, 80, 100][Math.floor(Math.random() * 4)];
            const time = [5, 10, 20][Math.floor(Math.random() * 3)];
            const speed = distance / time;
            
            questionText = `Grade ${studentGrade} Physics: An object travels ${distance} meters in ${time} seconds. Calculate its speed.`;
            qrActiveCorrectAnswer = `${speed} m/s`;
            optionsArray = [qrActiveCorrectAnswer, `${speed + 4} m/s`, `${speed * 2} m/s`, `${Math.max(1, speed - 2)} m/s`];
        } else {
            // Grade 9: Force and Acceleration (F = m * a)
            const mass = Math.floor(Math.random() * 8) + 3; // 3kg to 10kg
            const acc = Math.floor(Math.random() * 4) + 2;  // 2m/s² to 5m/s²
            const force = mass * acc;
            
            questionText = `Grade 9 Physics: Calculate the net force required to accelerate a ${mass}kg mass object at a rate of ${acc} m/s².`;
            qrActiveCorrectAnswer = `${force} N`;
            optionsArray = [qrActiveCorrectAnswer, `${force + 10} N`, `${mass + acc} N`, `${Math.max(1, force - 5)} N`];
        }
    } 
    // ==========================================
    // SUBJECT MATRIX: CHEMISTRY
    // ==========================================
    else if (subject === "Chemistry") {
        const chemistryPool = [
            { q: "What is the atomic number of Carbon (C)?", a: "6", g: "8" },
            { q: "What is the atomic number of Oxygen (O)?", a: "8", g: "8" },
            { q: "Is melting an ice cube a physical change or a chemical change?", a: "Physical Change", g: "7" },
            { q: "Is burning a piece of wood a physical change or a chemical change?", a: "Chemical Change", g: "7" },
            { q: "What gas molecule is produced on the right side of: 2H₂ + O₂ → ???", a: "2H₂O", g: "9" }
        ];
        
        // Filter elements matching student grade, fallback to entire pool if none match
        let filteredPool = chemistryPool.filter(item => item.g === studentGrade);
        if (filteredPool.length === 0) filteredPool = chemistryPool;
        
        const selected = filteredPool[Math.floor(Math.random() * filteredPool.length)];
        questionText = selected.q;
        qrActiveCorrectAnswer = selected.a;
        
        if (selected.a === "Physical Change" || selected.a === "Chemical Change") {
            optionsArray = ["Physical Change", "Chemical Change", "Nuclear Change", "No Change"];
        } else if (selected.a === "2H₂O") {
            optionsArray = ["2H₂O", "H₂O₂", "OH-", "2O₂"];
        } else {
            optionsArray = [qrActiveCorrectAnswer, "12", "14", "2"];
        }
    }

    // Scramble option positions dynamically
    optionsArray = [...new Set(optionsArray)]; // Remove any accidental duplicate options
    optionsArray.sort(() => Math.random() - 0.5);
    
    // Inject contents cleanly into the HTML DOM Tree elements
    document.getElementById('qr-question-text').innerText = questionText;
    const box = document.getElementById('qr-options-box');
    
    if (box) {
        box.innerHTML = optionsArray.map(opt => `
            <button class="qr-opt-card" onclick="processArcadeGuess('${opt}', '${subject}')">${opt}</button>
        `).join('');
    } else {
        console.error("Critical Error: 'qr-options-box' element could not be found in the DOM.");
    }
}

// 4. GUESS EVALUATION MATRIX WITH FREEZING PUNISHMENT CORES
function processArcadeGuess(chosenText, subject) {
    if (qrIsFrozen) return;

    if (chosenText === qrActiveCorrectAnswer) {
        qrRunningPointsEarned += 2;
        document.getElementById('qr-running-score').innerText = qrRunningPointsEarned;
        injectNextArcadeQuestion(subject);
    } else {
        qrRunningPointsEarned = Math.max(0, qrRunningPointsEarned - 1);
        document.getElementById('qr-running-score').innerText = qrRunningPointsEarned;
        
        // Trigger 3-Second Locking Sequence
        qrIsFrozen = true;
        let penaltySecondsLeft = 5;
        
        const banner = document.getElementById('qr-freeze-banner');
        const counterText = document.getElementById('qr-freeze-countdown');
        const cards = document.querySelectorAll('.qr-opt-card');
        
        // Disable target arrays visually
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
                // Auto load next puzzle node
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