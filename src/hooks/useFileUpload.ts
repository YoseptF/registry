import { useState } from 'react'
import { supabase } from '@/lib/supabase'

interface UseFileUploadOptions {
  bucket: string
  maxSizeMB?: number
  userId?: string
}

/**
 * Custom hook for handling file uploads to Supabase storage
 * Includes validation, preview, and upload functionality
 *
 * @param options - Configuration options
 * @param options.bucket - Supabase storage bucket name
 * @param options.maxSizeMB - Maximum file size in MB (default: 5)
 * @param options.userId - Optional user ID for file naming
 * @returns File upload utilities and state
 */
export function useFileUpload({
  bucket,
  maxSizeMB = 5,
  userId,
}: UseFileUploadOptions) {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      if (selectedFile.size > maxSizeMB * 1024 * 1024) {
        setError(`File must be less than ${maxSizeMB}MB`)
        return
      }
      if (!selectedFile.type.startsWith('image/')) {
        setError('Please upload an image file')
        return
      }
      setFile(selectedFile)
      setPreview(URL.createObjectURL(selectedFile))
      setError(null)
    }
  }

  const remove = () => {
    setFile(null)
    setPreview(null)
    setError(null)
  }

  const upload = async (): Promise<string | null> => {
    if (!file) return preview

    const fileExt = file.name.split('.').pop()
    const fileName = userId
      ? `${userId}-${Date.now()}.${fileExt}`
      : `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`
    const filePath = fileName

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, { upsert: true })

    if (uploadError) {
      console.error(`Error uploading to ${bucket}:`, uploadError)
      throw new Error('Failed to upload file')
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from(bucket).getPublicUrl(filePath)

    return publicUrl
  }

  const setInitialPreview = (url: string | null) => {
    setPreview(url)
  }

  return {
    file,
    preview,
    error,
    handleChange,
    remove,
    upload,
    setInitialPreview,
  }
}
