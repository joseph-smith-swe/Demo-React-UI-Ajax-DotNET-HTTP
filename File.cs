using Sabio.Models.Domain;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Sabio.Models.Domain.Files
{
    public class File
    {        
        public int Id { get; set; }
        
        public string Name { get; set; }
       
        public string Url { get; set; }

        public bool IsDeleted { get; set; }

        public BaseUser CreatedBy { get; set; }
        
        public DateTime DateCreated { get; set; }
        
        public LookUp FileType { get; set; }



    }
}
