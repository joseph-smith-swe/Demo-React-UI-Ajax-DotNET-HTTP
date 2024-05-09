using Amazon;
using Amazon.S3.Transfer;
using Amazon.S3;
using Sabio.Data;
using Sabio.Data.Providers;
using Sabio.Models;
using Sabio.Models.Domain;
using Sabio.Models.Domain.Files;
using Sabio.Models.Interfaces;
using Sabio.Models.Requests.Files;
using Sabio.Services.Interfaces;
using System;
using System.Collections;
using System.Collections.Generic;
using System.Data;
using System.Data.Common;
using System.Data.SqlClient;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using File = Sabio.Models.Domain.Files.File;
using Sabio.Models.AppSettings;
using Microsoft.Extensions.Options;
using Microsoft.AspNetCore.Http;
using Microsoft.VisualBasic.FileIO;
using Sabio.Models.Enums;
using Sabio.Data.Extensions;
using System.Reflection;
using Microsoft.AspNetCore.Mvc.Infrastructure;




namespace Sabio.Services
{
    public class FileService:IFileService
    {
        IDataProvider _data = null;
        ILookUpService _lookup = null;
        private AWSFileKeys _keys = null;        
        private readonly RegionEndpoint bucketRegion = RegionEndpoint.USWest2;
        private static IAmazonS3 s3Client;

        public FileService(IDataProvider data, ILookUpService lookup, IOptions<AWSFileKeys>keys) 
        {
            _data = data;
            _lookup = lookup;
            _keys = keys.Value;
            
        } 
     
        public void Delete(int id) 
        {
            string procName = "[dbo].[Files_Soft_Delete_ById]";
            _data.ExecuteNonQuery(procName,
                inputParamMapper:delegate(SqlParameterCollection paramCol)
                {
                    paramCol.AddWithValue("@Id", id);
                },
                returnParameters: null);
        }

        public void Recover(int id)
        {
            string procName = "[dbo].[Files_Recover_ById]";
            _data.ExecuteNonQuery(procName, 
                inputParamMapper: delegate (SqlParameterCollection paramCol)
            {
                paramCol.AddWithValue("@Id", id);
            },
            returnParameters: null);
        }

        public async Task<List<BaseFile>> AddFile(List<IFormFile> files, int userId)
        {
            List<BaseFile> resultList = null;

            FileAddRequest model = null;

            foreach (IFormFile file in files) 
            {
                string fileGuid = Guid.NewGuid().ToString();

                bool uploadSuccess = await UploadFileAsync(file, fileGuid);

                if (uploadSuccess)
                {
                    model = new FileAddRequest();

                    model.Name = System.IO.Path.GetFileNameWithoutExtension(file.FileName);
                    model.Url = $"{_keys.Domain}{file.FileName}{fileGuid}";
                    model.FileTypeId = (int)GetFileType(System.IO.Path.GetExtension(file.FileName).Trim('.'));

                   var basefile = AddFileDB(userId, model);

                    if (resultList == null)
                    {
                        resultList = new List<BaseFile>();
                    }
                    resultList.Add(basefile);
                }

            }            
                      
            return resultList;
        }

        private BaseFile AddFileDB(int userId, FileAddRequest model)
        {
            BaseFile result = null;

            string procName = "[dbo].[Files_Insert]";
            _data.ExecuteNonQuery(procName,
                                 delegate (SqlParameterCollection col)
                                 {                                     
                                     col.AddWithValue("@Name", model.Name);
                                     col.AddWithValue("@Url", model.Url);
                                     col.AddWithValue("@FileTypeId", model.FileTypeId);
                                     col.AddWithValue("@IsDeleted", model.IsDeleted);
                                     col.AddWithValue("@CreatedBy", userId);
                                     col.AddOutputParameter("@Id", SqlDbType.Int);                                    

                                 }, delegate (SqlParameterCollection col)
                                 {
                                     result = new BaseFile();
                                     int id;

                                     object idObj = col["@Id"].Value;
                                     Int32.TryParse(idObj.ToString(), out id);

                                     
                                     result.Id = id;
                                     result.Url = model.Url;

                                     
                                 });
            return result;
        }

                        
        private static FileType GetFileType(string fileType)
        {
            switch (fileType.ToLower())
            {
                case "jpg":
                    return FileType.jpg;
                case "pdf":
                    return FileType.pdf;
                case "jpeg":
                    return FileType.jpeg;
                case "doc":
                    return FileType.doc;
                case "png":
                    return FileType.png;
                case "gif":
                    return FileType.gif;
                case "webp":
                    return FileType.webp;
                case "svg":
                    return FileType.svg;
                case "html":
                    return FileType.html;
                case "xhtml":
                    return FileType.xhtml;
                case "txt":
                    return FileType.txt;
                default:
                    return FileType.jpg;
            }
        }    
          

        private async Task<bool> UploadFileAsync(IFormFile file, string fileGuid)
        {

            try
            {
                s3Client = new AmazonS3Client(_keys.AccessKey, _keys.Secret, bucketRegion); 


                var fileTransferUtility =
                    new TransferUtility(s3Client);
                                                
                await fileTransferUtility.UploadAsync(file.OpenReadStream(), _keys.BucketName, $"{file.FileName}{fileGuid}");
                Console.WriteLine("Upload 2 completed");
                                
            }
            catch (AmazonS3Exception e)
            {
                throw new Exception($"Error encountered on server. Message:'{0}' when writing an object: {e.Message}");
            }
            catch (Exception e)
            {
                throw new Exception($"Error encountered on server. Message:'{0}' when writing an object: {e.Message}");
            }
            return true;

        }

        
        public Paged<File> GetActiveFilesPaginated(int pageIndex, int pageSize, bool isDeleted)
        {
            string procName = "[dbo].[Files_Select_IsDeleted]";

            Paged<File> pagedResult = null;

            List<File> result = null;

            int totalCount = 0;

            _data.ExecuteCmd(
                procName,
                inputParamMapper: delegate (SqlParameterCollection paramCol)
                {
                    paramCol.AddWithValue("@PageIndex", pageIndex);
                    paramCol.AddWithValue("@PageSize", pageSize);
                    paramCol.AddWithValue("@IsDeleted", isDeleted);
                },
                singleRecordMapper: delegate (IDataReader reader, short set)
                {

                    File aFile;
                    int columnIndex;
                    SingleFileMapper(reader, out aFile, out columnIndex);


                    if (totalCount == 0)
                    {
                        totalCount = reader.GetSafeInt32(columnIndex++);
                    }

                    if (result == null)
                    {
                        result = new List<File>();

                    }
                    result.Add(aFile);

                }
                );
            if (result != null)
            {
                pagedResult = new Paged<File>(result, pageIndex, pageSize, totalCount);
            }
            return pagedResult;

        }        

        
        public Paged<File> GetByName(int pageIndex, int pageSize,string query)
        {
            string procName = "[dbo].[Files_Select_ByName]";    

            Paged<File> pagedResult = null;

            List<File> result = null;

            int totalCount = 0;

            _data.ExecuteCmd(procName,
                inputParamMapper:delegate(SqlParameterCollection paramCol)
                {
                    paramCol.AddWithValue("@PageIndex", pageIndex);
                    paramCol.AddWithValue("@PageSize", pageSize);
                    paramCol.AddWithValue("@Query", query);
                },
                singleRecordMapper:delegate(IDataReader reader, short set)
                {
                    File aFile;
                    int columnIndex;
                    SingleFileMapper(reader, out aFile, out columnIndex);
                   

                    if (totalCount == 0)
                    {
                        totalCount = reader.GetSafeInt32(columnIndex++);
                    }

                    if (result == null)
                    {
                        result = new List<File>();

                    }
                    result.Add(aFile);
                });

            if (result != null)
            {
                pagedResult = new Paged<File>(result, pageIndex, pageSize, totalCount);
            }
            return pagedResult;

        }            

        public Paged<File> GetByCreatedBy(int pageIndex, int pageSize,int createdBy)
        {
            string procName = "[dbo].[Files_Select_ByCreatedBy]";    

            Paged<File> pagedResult = null;

            List<File> result = null;

            int totalCount = 0;

            _data.ExecuteCmd(procName,
                inputParamMapper:delegate(SqlParameterCollection paramCol)
                {
                    paramCol.AddWithValue("@PageIndex", pageIndex);
                    paramCol.AddWithValue("@PageSize", pageSize);
                    paramCol.AddWithValue("@CreatedBy", createdBy);
                },
                singleRecordMapper:delegate(IDataReader reader, short set)
                {
                    File aFile;
                    int columnIndex;
                    SingleFileMapper(reader, out aFile, out columnIndex);
                   

                    if (totalCount == 0)
                    {
                        totalCount = reader.GetSafeInt32(columnIndex++);
                    }

                    if (result == null)
                    {
                        result = new List<File>();

                    }
                    result.Add(aFile);
                });

            if (result != null)
            {
                pagedResult = new Paged<File>(result, pageIndex, pageSize, totalCount);
            }
            return pagedResult;

        }   

        public Paged<File> GetAllByPagination(int pageIndex, int pageSize)
        {
            string procName = "[dbo].[Files_SelectAll]";

            Paged<File> pagedResult = null;

            List<File> result = null;

            int totalCount = 0;

            _data.ExecuteCmd(
                procName,
                inputParamMapper: delegate (SqlParameterCollection paramCol) 
                {
                    paramCol.AddWithValue("@PageIndex", pageIndex);
                    paramCol.AddWithValue("@PageSize", pageSize);
                },
                singleRecordMapper:delegate(IDataReader reader, short set)
                {

                    File aFile;
                    int columnIndex;
                    SingleFileMapper(reader, out aFile, out columnIndex);


                    if (totalCount == 0)
                    {
                        totalCount = reader.GetSafeInt32(columnIndex++);
                    }

                    if (result == null)
                    {
                        result = new List<File>();

                    }
                    result.Add(aFile);

                }
                );
            if (result != null)
            {
                pagedResult = new Paged<File>(result, pageIndex, pageSize, totalCount);
            }
            return pagedResult;

        }
                
        private void SingleFileMapper(IDataReader reader, out File aFile, out int columnIndex)
        {
            aFile = new File();
            columnIndex = 0;
            aFile.Id = reader.GetSafeInt32(columnIndex++);
            aFile.Name = reader.GetSafeString(columnIndex++);
            aFile.Url = reader.GetSafeString(columnIndex++);
            aFile.IsDeleted = reader.GetSafeBool(columnIndex++);
            aFile.CreatedBy = reader.DeserializeObject<BaseUser>(columnIndex++);
            aFile.DateCreated = reader.GetSafeUtcDateTime(columnIndex++);
            aFile.FileType = _lookup.MapSingleLookUp(reader, ref columnIndex);
            

        }


                
                
    }
}
