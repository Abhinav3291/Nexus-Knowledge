import { useState, useRef } from 'react'
import { Upload, CheckCircle, AlertCircle, Loader2, FileText } from 'lucide-react'

interface FileUploadProps {
  onUploadComplete?: (success: boolean, message: string) => void
}

export default function FileUpload({ onUploadComplete }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState<Array<{ name: string; status: 'success' | 'error' | 'uploading'; message: string }>>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const uploadFiles = async (files: FileList) => {
    setIsUploading(true)
    const newFiles: typeof uploadedFiles = []

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      
      if (!file.name.toLowerCase().endsWith('.pdf')) {
        newFiles.push({ name: file.name, status: 'error', message: 'Only PDF files are supported' })
        continue
      }

      newFiles.push({ name: file.name, status: 'uploading', message: 'Uploading...' })
      setUploadedFiles([...uploadedFiles, ...newFiles])

      const formData = new FormData()
      formData.append('file', file)

      try {
        const response = await fetch('http://localhost:8000/upload', {
          method: 'POST',
          body: formData,
        })

        // Handle different response types
        interface UploadResponse {
          status: 'success' | 'failed'
          error?: string
          message?: string
        }
        
        let data: UploadResponse = { status: 'failed', error: 'Unknown error' }
        
        try {
          const contentType = response.headers.get('content-type') || ''
          if (contentType.includes('application/json')) {
            data = await response.json()
          } else {
            data = { error: `Server returned ${response.status}: Invalid response format`, status: 'failed' }
          }
        } catch (parseError) {
          data = { error: 'Could not parse server response. Backend may not be running.', status: 'failed' }
          console.error('Response parse error:', parseError)
        }

        if (response.ok && data?.status === 'success') {
          newFiles[newFiles.length - 1] = {
            name: file.name,
            status: 'success',
            message: 'Processed successfully',
          }
          onUploadComplete?.(true, `${file.name} uploaded and processed`)
        } else {
          const errorMsg = (typeof data?.error === 'string' && data.error.length > 0) 
            ? data.error 
            : `Upload failed (${response.status})`
          newFiles[newFiles.length - 1] = {
            name: file.name,
            status: 'error',
            message: errorMsg,
          }
          onUploadComplete?.(false, errorMsg)
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Network error - Is backend running?'
        console.error('Upload error:', error)
        newFiles[newFiles.length - 1] = {
          name: file.name,
          status: 'error',
          message: errorMsg,
        }
        onUploadComplete?.(false, errorMsg)
      }
    }

    setUploadedFiles(newFiles)
    setIsUploading(false)

    // Clear uploaded files after 5 seconds
    setTimeout(() => {
      setUploadedFiles([])
    }, 5000)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files) {
      uploadFiles(e.dataTransfer.files)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      uploadFiles(e.target.files)
    }
  }

  return (
    <div className="w-full space-y-4">
      {/* Upload Area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all duration-300 overflow-hidden ${
          isDragging
            ? 'border-blue-400 bg-blue-500/10'
            : 'border-gray-700/50 bg-gray-900/50 hover:border-gray-600/50 hover:bg-gray-900/70'
        }`}
      >
        {/* Decorative gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-purple-500/5 pointer-events-none" />
        
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf"
          onChange={handleFileSelect}
          className="hidden"
        />
        
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="relative w-full flex flex-col items-center gap-3 text-gray-400 hover:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <div className={`p-4 rounded-2xl transition-all duration-300 ${
            isDragging 
              ? 'bg-blue-500/20 text-blue-400' 
              : 'bg-gray-800/50 text-gray-500 group-hover:bg-gray-700/50'
          }`}>
            {isUploading ? (
              <Loader2 size={28} className="animate-spin text-blue-400" />
            ) : (
              <Upload size={28} />
            )}
          </div>
          <div className="text-sm">
            <p className="font-medium text-gray-300">
              {isDragging ? 'Drop your files here' : 'Drag & drop PDFs here'}
            </p>
            <p className="text-xs text-gray-500 mt-1.5">or click to browse • PDF files only</p>
          </div>
        </button>
      </div>

      {/* Upload Status */}
      {uploadedFiles.length > 0 && (
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {uploadedFiles.map((uploadedFile, idx) => (
            <div
              key={idx}
              className={`flex items-center gap-3 p-3.5 rounded-xl text-sm animate-fade-in ${
                uploadedFile.status === 'success'
                  ? 'bg-green-500/10 border border-green-500/30'
                  : uploadedFile.status === 'error'
                  ? 'bg-red-500/10 border border-red-500/30'
                  : 'bg-blue-500/10 border border-blue-500/30'
              }`}
            >
              {uploadedFile.status === 'uploading' ? (
                <Loader2 size={18} className="animate-spin text-blue-400 flex-shrink-0" />
              ) : uploadedFile.status === 'success' ? (
                <CheckCircle size={18} className="text-green-400 flex-shrink-0" />
              ) : (
                <AlertCircle size={18} className="text-red-400 flex-shrink-0" />
              )}
              
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <FileText size={16} className="text-gray-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className={`truncate font-medium ${
                    uploadedFile.status === 'success' ? 'text-green-300' :
                    uploadedFile.status === 'error' ? 'text-red-300' : 'text-blue-300'
                  }`}>
                    {uploadedFile.name}
                  </p>
                  <p className="text-xs opacity-75 text-gray-400">{uploadedFile.message}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
