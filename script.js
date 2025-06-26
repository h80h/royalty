const imgs = document.querySelectorAll("img");
const dialog = document.querySelector("dialog");
let currentElementId = null;


imgs.forEach(img => {
    img.addEventListener('click', function(event) {
        dialog.innerHTML = "";
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
            dialog.prepend(dialog_img);
            dialog.innerHTML += `<label for="img">Kemonokaki #${currentElementId}</label>
            <pre>${JSON.stringify(cleanAttributes, null, 4)}</pre>`;
          })
          .catch(err => {
            console.error(err);
            dialog.innerHTML = `<p style="color: red;">Error loading NFT data: ${err.message}</p>`;
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


