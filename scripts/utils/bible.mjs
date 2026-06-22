#!/usr/bin/env node

/**
 * Bible Manager Module
 * CRUD operations for Character Bible and World Bible
 * 
 * Usage:
 *   bible init <project>
 *   bible add character <name>
 *   bible add location <name>
 *   bible add item <name>
 *   bible update <entity> <field> <value>
 *   bible show <entity>
 *   bible list <type>
 *   bible snapshot <chapter>
 *   bible diff <ch1> <ch2>
 *   bible export
 */

import fs from 'fs';
import path from 'path';

class BibleManager {
  constructor(projectSlug) {
    this.projectSlug = projectSlug;
    this.dataDir = path.join(process.cwd(), 'data', projectSlug);
    this.biblePath = path.join(this.dataDir, 'bible.json');
  }

  // Initialize new project Bible
  init(projectName) {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }

    const bible = {
      project: {
        name: projectName,
        slug: this.projectSlug,
        genre: 'fantasy',
        pov: 'first-person',
        mc: null,
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
        totalChapters: 0,
        currentArc: 1
      },
      characters: {},
      locations: {},
      items: {},
      factions: {},
      history: [],
      worldRules: {
        magic: { system: '', levels: [], rules: [], limitations: [] },
        physics: { notes: '' },
        society: { notes: '' }
      },
      snapshots: {}
    };

    fs.writeFileSync(this.biblePath, JSON.stringify(bible, null, 2));
    console.log(`✅ Project "${projectName}" initialized at ${this.dataDir}`);
    return bible;
  }

  // Read Bible
  read() {
    if (!fs.existsSync(this.biblePath)) {
      throw new Error(`Bible not found at ${this.biblePath}`);
    }
    return JSON.parse(fs.readFileSync(this.biblePath, 'utf8'));
  }

  // Write Bible
  write(bible) {
    bible.project.updated = new Date().toISOString();
    fs.writeFileSync(this.biblePath, JSON.stringify(bible, null, 2));
  }

  // Add character
  addCharacter(name, options = {}) {
    const bible = this.read();
    const slug = this.slugify(name);

    if (bible.characters[slug]) {
      console.warn(`⚠️  Character "${name}" already exists`);
      return;
    }

    bible.characters[slug] = {
      identity: {
        name: name,
        aliases: options.aliases || [],
        age: options.age || null,
        gender: options.gender || 'unknown',
        species: options.species || 'human',
        appearance: {
          height: options.height || '',
          build: options.build || '',
          face: options.face || '',
          distinguishing: options.distinguishing || '',
          clothing: options.clothing || ''
        },
        background: options.background || ''
      },
      personality: {
        traits: options.traits || [],
        motivations: options.motivations || [],
        fears: options.fears || [],
        desires: options.desires || [],
        moralCompass: options.moralCompass || '',
        quirks: options.quirks || []
      },
      relationships: [],
      voice: {
        vocabularyLevel: options.vocabularyLevel || 'educated',
        sentenceStyle: options.sentenceStyle || 'flowing',
        catchphrases: options.catchphrases || [],
        dialect: options.dialect || '',
        emotionalExpression: {
          anger: options.angerStyle || '',
          joy: options.joyStyle || '',
          fear: options.fearStyle || '',
          love: options.loveStyle || ''
        },
        forbiddenWords: options.forbiddenWords || [],
        speechQuirks: options.speechQuirks || []
      },
      arc: {
        type: options.arcType || 'unknown',
        trajectory: []
      },
      states: {}
    };

    // Set initial state (chapter 0)
    bible.characters[slug].states['ch00'] = {
      location: options.startLocation || '',
      condition: options.condition || 'alive',
      knowledge: options.initialKnowledge || [],
      possessions: options.initialPossessions || [],
      powerLevel: options.initialPowerLevel || 0,
      notes: options.stateNotes || ''
    };

    this.write(bible);
    console.log(`✅ Character "${name}" added`);
  }

  // Add location
  addLocation(name, options = {}) {
    const bible = this.read();
    const slug = this.slugify(name);

    if (bible.locations[slug]) {
      console.warn(`⚠️  Location "${name}" already exists`);
      return;
    }

    bible.locations[slug] = {
      name: name,
      type: options.type || 'place',
      region: options.region || '',
      geography: {
        terrain: options.terrain || '',
        climate: options.climate || '',
        landmarks: options.landmarks || []
      },
      culture: {
        population: options.population || '',
        language: options.language || '',
        customs: options.customs || '',
        politics: options.politics || ''
      },
      connections: [],
      firstAppearance: options.firstAppearance || null,
      significance: options.significance || ''
    };

    this.write(bible);
    console.log(`✅ Location "${name}" added`);
  }

  // Add item
  addItem(name, options = {}) {
    const bible = this.read();
    const slug = this.slugify(name);

    if (bible.items[slug]) {
      console.warn(`⚠️  Item "${name}" already exists`);
      return;
    }

    bible.items[slug] = {
      name: name,
      type: options.type || 'object',
      description: options.description || '',
      properties: {
        material: options.material || '',
        weight: options.weight || '',
        powers: options.powers || [],
        limitations: options.limitations || []
      },
      owner: options.owner || null,
      ownerHistory: [],
      firstAppearance: options.firstAppearance || null,
      currentLocation: options.currentLocation || ''
    };

    this.write(bible);
    console.log(`✅ Item "${name}" added`);
  }

  // Update character state
  updateCharacterState(characterSlug, chapter, updates) {
    const bible = this.read();
    const char = bible.characters[characterSlug];

    if (!char) {
      console.error(`❌ Character "${characterSlug}" not found`);
      return;
    }

    const chKey = `ch${String(chapter).padStart(2, '0')}`;
    if (!char.states[chKey]) {
      char.states[chKey] = char.states['ch00'] ? { ...char.states['ch00'] } : {};
    }

    Object.assign(char.states[chKey], updates);
    this.write(bible);
    console.log(`✅ Updated ${characterSlug} state for chapter ${chapter}`);
  }

  // Create snapshot
  snapshot(chapter) {
    const bible = this.read();
    const chKey = `ch${String(chapter).padStart(2, '0')}`;

    const snapshot = {
      timestamp: new Date().toISOString(),
      characterStates: {},
      notes: ''
    };

    // Collect current states of all characters
    for (const [charSlug, char] of Object.entries(bible.characters)) {
      // Find most recent state at or before this chapter
      let state = char.states['ch00'] || {};
      for (let i = 0; i <= chapter; i++) {
        const key = `ch${String(i).padStart(2, '0')}`;
        if (char.states[key]) {
          state = char.states[key];
        }
      }
      snapshot.characterStates[charSlug] = state;
    }

    if (!bible.snapshots) bible.snapshots = {};
    bible.snapshots[chKey] = snapshot;
    this.write(bible);
    console.log(`✅ Snapshot created for chapter ${chapter}`);
  }

  // Diff snapshots
  diff(ch1, ch2) {
    const bible = this.read();
    const key1 = `ch${String(ch1).padStart(2, '0')}`;
    const key2 = `ch${String(ch2).padStart(2, '0')}`;

    const snap1 = bible.snapshots[key1];
    const snap2 = bible.snapshots[key2];

    if (!snap1 || !snap2) {
      console.error(`❌ One or both snapshots not found`);
      return;
    }

    console.log(`\n📊 Diff between Chapter ${ch1} and Chapter ${ch2}\n`);

    for (const charSlug of Object.keys(snap1.characterStates)) {
      const state1 = snap1.characterStates[charSlug];
      const state2 = snap2.characterStates[charSlug];

      if (JSON.stringify(state1) !== JSON.stringify(state2)) {
        console.log(`\n${bible.characters[charSlug].identity.name}:`);

        if (state1.location !== state2.location) {
          console.log(`  Location: ${state1.location} → ${state2.location}`);
        }
        if (state1.powerLevel !== state2.powerLevel) {
          console.log(`  Power: ${state1.powerLevel} → ${state2.powerLevel}`);
        }
        if (state1.condition !== state2.condition) {
          console.log(`  Condition: ${state1.condition} → ${state2.condition}`);
        }
        if (JSON.stringify(state1.possessions) !== JSON.stringify(state2.possessions)) {
          console.log(`  Possessions changed`);
        }
      }
    }
  }

  // List entities
  list(type) {
    const bible = this.read();
    const entities = bible[type + 's'] || {};

    console.log(`\n📋 ${type.charAt(0).toUpperCase() + type.slice(1)}s:\n`);
    for (const [slug, entity] of Object.entries(entities)) {
      console.log(`  • ${entity.name || entity.identity?.name} (${slug})`);
    }
  }

  // Export Bible to markdown
  export() {
    const bible = this.read();
    let md = `# ${bible.project.name} — Character & World Bible\n\n`;

    // Characters
    md += `## Characters\n\n`;
    for (const [slug, char] of Object.entries(bible.characters)) {
      md += `### ${char.identity.name}\n`;
      md += `**Aliases:** ${char.identity.aliases.join(', ') || 'None'}\n`;
      md += `**Age:** ${char.identity.age || 'Unknown'}\n`;
      md += `**Background:** ${char.identity.background}\n`;
      md += `**Traits:** ${char.personality.traits.join(', ')}\n\n`;
    }

    // Locations
    md += `## Locations\n\n`;
    for (const [slug, loc] of Object.entries(bible.locations)) {
      md += `### ${loc.name}\n`;
      md += `**Type:** ${loc.type}\n`;
      md += `**Region:** ${loc.region}\n`;
      md += `**Significance:** ${loc.significance}\n\n`;
    }

    // Items
    md += `## Significant Items\n\n`;
    for (const [slug, item] of Object.entries(bible.items)) {
      md += `### ${item.name}\n`;
      md += `**Type:** ${item.type}\n`;
      md += `**Description:** ${item.description}\n`;
      md += `**Powers:** ${item.properties.powers.join(', ') || 'None'}\n\n`;
    }

    const exportPath = path.join(this.dataDir, 'Bible-Export.md');
    fs.writeFileSync(exportPath, md);
    console.log(`✅ Bible exported to ${exportPath}`);
  }

  // Utility: slugify name
  slugify(name) {
    return name.toLowerCase()
      .replace(/đ/g, 'd')
      .replace(/à|á|ả|ã|ạ/g, 'a')
      .replace(/è|é|ẻ|ẽ|ẹ/g, 'e')
      .replace(/ì|í|ỉ|ĩ|ị/g, 'i')
      .replace(/ò|ó|ỏ|õ|ọ|ơ|ờ|ớ|ở|ỡ|ợ/g, 'o')
      .replace(/ù|ú|ủ|ũ|ụ|ư|ừ|ứ|ử|ữ|ự/g, 'u')
      .replace(/ỳ|ý|ỷ|ỹ|ỵ/g, 'y')
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');
  }
}

export default BibleManager;
