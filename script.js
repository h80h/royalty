const imgs = document.querySelectorAll("img");
const dialog = document.querySelector("dialog");
const dialog_div = document.querySelector("dialog div");
let currentElementId = null;


imgs.forEach(img => {
    img.addEventListener('click', function(event) {
        dialog_div.innerHTML = "";
        const img_url = img.src; 
        console.log(img_url);
        const numbers = img_url.match(/\d+/g);
        const lastNumber = numbers[numbers.length - 1];
        currentElementId = lastNumber;
        console.log('Selected element ID:', currentElementId);

        const url = `/api/opensea/${currentElementId}`;
        
        const dialog_img = document.createElement("img");
        
        fetch(url)
          .then(res => res.json())
          .then(json => {
            // Check for backend errors
            if (json.Error) {
              throw new Error(json.Error);
            }

          const attributes = json.nft.traits || json.nft.metadata?.attributes || [];
          const cleanAttributes = attributes.map(attr => ({
            trait_type: attr.trait_type,
            value: attr.value
          }));
            
          dialog_img.src = img.src;
          dialog_div.prepend(dialog_img);

          // Format attributes as readable text instead of JSON
          const attributesText = cleanAttributes
            .map(attr => `${attr.trait_type}: ${attr.value}`)
            .join('\n');

          dialog_div.innerHTML += `<label for="img">Kemonokaki #${currentElementId}</label>
          <div style="font-family: monospace; white-space: pre-wrap; word-wrap: break-word;">${attributesText}</div>`;
          })

          .catch(err => {
            console.error(err);
            dialog_div.innerHTML = `<p style="color: red;">Error loading NFT data: ${err.message}</p>`;
          });
        
        dialog.addEventListener("click", e => {
        const dialogDimensions = dialog.getBoundingClientRect()
        if (
          e.clientX < dialogDimensions.left ||
          e.clientX > dialogDimensions.right ||
          e.clientY < dialogDimensions.top ||
          e.clientY > dialogDimensions.bottom
        ) {
          dialog.close();
        }});

        dialog.showModal();
    });
});


