<script lang="ts">
  import { onMount } from 'svelte';

  let bhsData = null;
  let lxxData = null;
  let sblgntData = null;
  let alignmentData = null;

  onMount(async () => {
    // In a real implementation, we would fetch based on route /book/chapter
    // For scaffolding, we just prove the data is available
    const alignmentRes = await fetch('/data/tvtms_alignment.json');
    alignmentData = await alignmentRes.json();
    console.log("Loaded TVTMS Alignment:", Object.keys(alignmentData).length, "rules");
  });
</script>

<div class="min-h-screen bg-gray-50 text-gray-900 font-sans p-8">
  <header class="mb-8 border-b pb-4">
    <h1 class="text-3xl font-bold">Polyglot Ancient Text Reader</h1>
    <p class="text-gray-600 mt-2">BHS | LXX | SBLGNT</p>
  </header>

  <main>
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      
      <!-- BHS Column -->
      <section class="bg-white p-6 rounded shadow-sm border">
        <h2 class="text-xl font-bold mb-4 border-b pb-2">Hebrew (BHS)</h2>
        <div class="text-right text-lg" dir="rtl">
          <!-- Text will go here -->
          <p class="mb-2"><span class="text-xs text-gray-400 mr-2">1</span> בְּרֵאשִׁ֖ית בָּרָ֣א אֱלֹהִ֑ים אֵ֥ת הַשָּׁמַ֖יִם וְאֵ֥ת הָאָֽרֶץ׃</p>
        </div>
      </section>

      <!-- LXX Column -->
      <section class="bg-white p-6 rounded shadow-sm border">
        <h2 class="text-xl font-bold mb-4 border-b pb-2">Greek (LXX)</h2>
        <div class="text-lg">
          <!-- Text will go here -->
          <p class="mb-2"><span class="text-xs text-gray-400 mr-2">1</span> Ἐν ἀρχῇ ἐποίησεν ὁ θεὸς τὸν οὐρανὸν καὶ τὴν γῆν.</p>
        </div>
      </section>
      
      <!-- SBLGNT Column -->
      <section class="bg-white p-6 rounded shadow-sm border">
        <h2 class="text-xl font-bold mb-4 border-b pb-2">Greek NT (SBLGNT)</h2>
        <div class="text-lg">
          <!-- Text will go here -->
          <p class="mb-2"><span class="text-xs text-gray-400 mr-2">1</span> Βίβλος γενέσεως Ἰησοῦ χριστοῦ υἱοῦ Δαυὶδ υἱοῦ Ἀβραάμ.</p>
        </div>
      </section>

    </div>
  </main>
</div>
