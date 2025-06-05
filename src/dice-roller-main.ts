// Import Alpine.js and DiceBox from local node_modules
import DiceBox from "@3d-dice/dice-box";
import Alpine from "alpinejs";
import "./dice-roller.css";

// Type declarations for missing modules
declare global {
  interface Window {
    diceBox: any;
    diceRoller: () => any;
  }
}

// Global dice box instance
let diceBox: any = null;

interface RollHistoryItem {
  hope: number;
  fear: number;
  advantage: number;
  modifier: number;
  total: number;
  result: string;
}

// Alpine.js component for UI
function diceRoller() {
  return {
    hopeValue: 0,
    fearValue: 0,
    result: "",
    isRolling: false,
    rollHistory: [] as RollHistoryItem[],
    showHistory: false,
    advantageType: "none" as "none" | "advantage" | "disadvantage",
    advantageValue: 0,
    modifier: 0,

    setAdvantageType(type: "none" | "advantage" | "disadvantage") {
      this.advantageType = type;
      if (type === "none") {
        this.advantageValue = 0;
      }
    },

    async rollDice() {
      if (this.isRolling || !window.diceBox) return;

      this.isRolling = true;
      this.result = "";

      try {
        // Prepare dice array - always roll two D12 dice
        const diceArray = [
          { sides: 12, theme: "default", themeColor: "#4caf50" }, // Hope die (green)
          { sides: 12, theme: "default", themeColor: "#f44336" }, // Fear die (red)
        ];

        // Add advantage/disadvantage D6 if needed
        if (this.advantageType !== "none") {
          diceArray.push({
            sides: 6,
            theme: "smooth",
            themeColor:
              this.advantageType === "advantage" ? "#d2ffd2" : "#ffd2d2",
          });
        }

        const rollResult = await window.diceBox.roll(diceArray);

        console.log("Roll result:", rollResult);

        // Extract the values from the roll result
        if (rollResult && rollResult.length >= 2) {
          this.hopeValue = rollResult[0].value;
          this.fearValue = rollResult[1].value;

          // Handle advantage/disadvantage D6
          if (this.advantageType !== "none" && rollResult.length >= 3) {
            const d6Value = rollResult[2].value;
            this.advantageValue =
              this.advantageType === "advantage" ? d6Value : -d6Value;
          } else {
            this.advantageValue = 0;
          }
        } else {
          // Fallback to random values if dice-box fails
          this.hopeValue = Math.floor(Math.random() * 12) + 1;
          this.fearValue = Math.floor(Math.random() * 12) + 1;

          if (this.advantageType !== "none") {
            const d6Value = Math.floor(Math.random() * 6) + 1;
            this.advantageValue =
              this.advantageType === "advantage" ? d6Value : -d6Value;
          } else {
            this.advantageValue = 0;
          }
        }

        // Calculate total with modifiers
        const baseTotal = this.hopeValue + this.fearValue;
        const finalTotal = baseTotal + this.advantageValue + this.modifier;

        // Calculate result text
        let resultText = "";
        let modifierText = "";

        if (this.advantageValue !== 0 || this.modifier !== 0) {
          const parts = [baseTotal.toString()];
          if (this.advantageValue !== 0) {
            parts.push(
              `${this.advantageValue > 0 ? "+" : "-"} ${Math.abs(
                this.advantageValue
              )} ${this.advantageType}`
            );
          }
          if (this.modifier !== 0) {
            parts.push(
              `${this.modifier > 0 ? "+" : "-"} ${Math.abs(
                this.modifier
              )} modifier`
            );
          }
          modifierText = ` <small>(${parts.join(" ")})</small>`;
        }

        if (this.hopeValue === this.fearValue) {
          resultText = "Critical Success!";
        } else if (this.hopeValue > this.fearValue) {
          resultText = `${finalTotal} with hope${modifierText}`;
        } else {
          resultText = `${finalTotal} with fear${modifierText}`;
        }

        this.result = resultText;

        // Add to roll history
        this.rollHistory.unshift({
          hope: this.hopeValue,
          fear: this.fearValue,
          advantage: this.advantageValue,
          modifier: this.modifier,
          total: finalTotal,
          result: resultText,
        });

        // Limit history to 10 items
        if (this.rollHistory.length > 10) {
          this.rollHistory = this.rollHistory.slice(0, 10);
        }
      } catch (error) {
        console.error("Error rolling dice:", error);

        // Fallback to random values
        this.hopeValue = Math.floor(Math.random() * 12) + 1;
        this.fearValue = Math.floor(Math.random() * 12) + 1;

        if (this.advantageType !== "none") {
          const d6Value = Math.floor(Math.random() * 6) + 1;
          this.advantageValue =
            this.advantageType === "advantage" ? d6Value : -d6Value;
        } else {
          this.advantageValue = 0;
        }

        const baseTotal = this.hopeValue + this.fearValue;
        const finalTotal = baseTotal + this.advantageValue + this.modifier;

        let resultText = "";
        let modifierText = "";

        if (this.advantageValue !== 0 || this.modifier !== 0) {
          const parts = [];
          if (this.advantageValue !== 0) {
            parts.push(
              `${this.advantageValue > 0 ? "+" : ""}${this.advantageValue} ${
                this.advantageType
              }`
            );
          }
          if (this.modifier !== 0) {
            parts.push(
              `${this.modifier > 0 ? "+" : ""}${this.modifier} modifier`
            );
          }
          modifierText = ` (${parts.join(", ")})`;
        }

        if (this.hopeValue === this.fearValue) {
          resultText = `Critical Success! Total: ${finalTotal}${modifierText}`;
        } else if (this.hopeValue > this.fearValue) {
          resultText = `Total: ${finalTotal} with hope${modifierText}`;
        } else {
          resultText = `Total: ${finalTotal} with fear${modifierText}`;
        }

        this.result = resultText;
      } finally {
        this.isRolling = false;
      }
    },

    toggleHistory() {
      this.showHistory = !this.showHistory;
    },
  };
}

// Initialize dice-box when the page loads
document.addEventListener("DOMContentLoaded", function () {
  console.log("DOM loaded, initializing dice-box");

  // Initialize dice-box with configuration
  diceBox = new DiceBox({
    container: "#dice-box",
    assetPath: "/assets/",
    theme: "default",
    themeColor: "#4caf50",
    scale: 10,
    gravity: 1.5,
    mass: 1,
    friction: 0.8,
    restitution: 0.5,
    angularDamping: 0.4,
    linearDamping: 0.5,
    spinForce: 6,
    throwForce: 5,
    startingHeight: 8,
    settleTimeout: 5000,
    offscreen: false,
    delay: 10,
    enableShadows: true,
    lightIntensity: 0.9,
    suspendSimulation: false,
  });

  // Initialize the dice box
  diceBox
    .init()
    .then(() => {
      console.log("Dice-box initialized successfully");
    })
    .catch((error: any) => {
      console.error("Failed to initialize dice-box:", error);
    });

  // Make diceBox available globally for Alpine.js
  window.diceBox = diceBox;
});

// Register Alpine.js component globally
window.diceRoller = diceRoller;

// Start Alpine.js
Alpine.start();
