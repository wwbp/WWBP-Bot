import React, {useEffect, useState} from "react";
import {getPresignedUrlForDisplay}  from "../utils/api";


function UploadedFile({ files }) {

const [pdfFile, setPdfFile] = React.useState(null);
const [error, setError] = React.useState(null);
console.log("Fetching file from 2 outside:", files.files);
// console.log("Fetching file from:", selectedTask.files);

useEffect(()=>{
    const fetchFile = async () =>{
        try{
            console.log("Fetching file from 2:", files.files[0]);
            // console.log("Fetching file from:", file.files);
            // const fileName = file.files[0].split('/upload/')[1]
            const fileName = files.files[0].split('/upload/')[1]
            const preSignedUrl = await getPresignedUrlForDisplay(fileName);
            console.log("PreSignedUrl:", preSignedUrl);
            const response = await fetch(preSignedUrl.url);
            if(!response.ok){
                throw new Error("Failed to fetch file");
            }
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            setPdfFile(url);
        }catch (error){
            console.error("Error fetching file:", error);
            setError(error.message);
        }
    };
    fetchFile();
}, [files]);

if (error) {
    return <div>Error: {error}</div>;
}

return (
    <div style={{width:'100%', height:'100%', overflow:'auto'}}>
      {pdfFile && (
        <embed
          src={pdfFile}
          width="100%"
          height="100%"
          type="application/pdf"
          title="Uploaded file"
        />
      )}
    </div>
);

};

export default UploadedFile;