import React, { useEffect, useState } from "react";
import Swal from "sweetalert2";
import debug from "sabio-debug";
import fileManagerService from "services/fileManagerService";
import FileManagerRow from "./FileManagerRow";
import "./filemanager.css";
import toastr from "toastr";

const _logger = debug.extend("Files");

function FileManager() {
  const [tableData, setTableData] = useState({
    arrayOfFiles: [],
    fileComponents: [],
    searchByNameFiles: [],
  });

  const [searchFilesInputField, setSearchFilesInputField] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const [isActivePrevDisabled, setIsActivePrevDisabled] = useState(true);
  const [isActiveNextDisabled, setIsActiveNextDisabled] = useState(false);

  const [searchPage, setSearchPage] = useState(1);
  const [isPrevSearchDisabled, setIsPrevSearchDisabled] = useState(true);
  const [isNextSearchDisabled, setIsNextSearchDisabled] = useState(false);

  const [isShowActiveView, setIsShowActiveView] = useState(true);

  useEffect(() => {
    setIsPrevSearchDisabled(searchPage === 1);
  }, [searchPage]);

  const handleSearchPrevPage = () => {
    setSearchPage((prevPage) => prevPage - 1);
  };

  const handleSearchNextPage = () => {
    setSearchPage((prevPage) => prevPage + 1);
  };

  useEffect(() => {
    if (searchFilesInputField !== "") {
      fileManagerService
        .getFilesByName(searchPage - 1, 10, searchFilesInputField)
        .then(getSearchByNameOnSuccess)
        .catch(getSearchByNameOnError);
    }
  }, [searchFilesInputField, searchPage]);

  useEffect(() => {
    setIsActivePrevDisabled(currentPage === 1);
  }, [currentPage]);

  useEffect(() => {
    dataForPages(currentPage);
  }, [currentPage]);

  const dataForPages = (page) => {
    fileManagerService
      .getActiveFiles(page - 1, 10, false)
      .then(getFileDataOnSuccess)
      .catch(getFileDataOnError);
  };

  const handleNextPage = () => {
    _logger("handleNextPage is firing <-----");
    setCurrentPage(currentPage + 1);
  };

  const handlePrevPage = () => {
    _logger("handlePrevPage is firing <-----");
    setCurrentPage(currentPage - 1);
  };

  const toggleView = () => {
    setIsShowActiveView(!isShowActiveView);
    if (isShowActiveView) {
      fileManagerService
        .getActiveFiles(0, 10, true)
        .then(getFileDataOnSuccess)
        .catch(getFileDataOnError);
    } else {
      fileManagerService
        .getActiveFiles(0, 10, false)
        .then(getFileDataOnSuccess)
        .catch(getFileDataOnError);
    }
    setCurrentPage(1);
  };

  const getFileDataOnSuccess = (response) => {
    const filesArray = response.item.pagedItems;
    _logger("This is the filesArray: ", filesArray);

    setTableData((prevState) => {
      const nsoFileData = { ...prevState };
      nsoFileData.arrayOfFiles = filesArray;
      nsoFileData.fileComponents = filesArray.map(mapTableRow);

      setIsActiveNextDisabled(
        !response.item.hasNextPage && response.item.pagedItems.length <= 10
      );

      return nsoFileData;
    });
  };
  const getFileDataOnError = (error) => {
    _logger("This is an getFileDataOnError error", error);
    toastr.error("Unsuccessful data retrieval. Please try again.", {
      timeOut: 5000,
    });
  };

  const getSearchByNameOnSuccess = (response) => {
    const filesArray = response.item.pagedItems;
    _logger("This is the searchByName filesArray: ", filesArray);
    setTableData((prevState) => {
      const nsoByNameData = { ...prevState };
      nsoByNameData.searchByNameFiles = filesArray;
      nsoByNameData.fileComponents = filesArray.map(mapTableRow);

      _logger("Search Next response object: ", response);
      setIsNextSearchDisabled(
        !response.item.hasNextPage && response.item.pagedItems.length <= 10
      );

      return nsoByNameData;
    });
  };

  const getSearchByNameOnError = (error) => {
    _logger("getSearchByNameOnError error response: ", error);
    toastr.error("Unsuccessful data retrieval. Please try again.", {
      timeOut: 5000,
    });
  };

  const onDeleteRequested = (file) => {
    Swal.fire({
      title: "Are you sure?",
      text: "You can recover this file later.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes, delete it!",
    }).then((result) => {
      if (result.isConfirmed) {
        _logger("onDeleteRequested is firing!!");
        _logger("The file being deleted: ", file);
        _logger("The file id of that file: ", file.id);

        const handler = getDeleteSuccessHandler(file.id);
        fileManagerService
          .deleteAFile(file.id)
          .then(handler)
          .catch(onDeleteError);
      }
    });
  };

  const getDeleteSuccessHandler = (idToBeDeleted) => {
    return () => {
      setTableData((prevState) => {
        const updatedData = { ...prevState };
        updatedData.arrayOfFiles = updatedData.arrayOfFiles.filter(
          (file) => file.id !== idToBeDeleted
        );
        updatedData.fileComponents = updatedData.arrayOfFiles.map(mapTableRow);
        return updatedData;
      });
    };
  };

  const onDeleteError = (error) => {
    _logger("onDeleteError is: ", error);
    toastr.error("Unsuccessful delete. Please try again.", {
      timeOut: 5000,
    });
  };

  const onRecoverRequested = (file) => {
    Swal.fire({
      title: "Are you sure?",
      text: "You are about to recover this file!",
      icon: "info",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes, recover it!",
    }).then((result) => {
      if (result.isConfirmed) {
        _logger("onRecoverRequested is firing!!");
        _logger("The file being recovered: ", file);
        _logger("The file id of that file: ", file.id);

        const handler = getRecoverSuccessHandler(file.id);
        fileManagerService
          .recoverAFile(file.id)
          .then(handler)
          .catch(onRecoverError);
      }
    });
  };

  const getRecoverSuccessHandler = (idToBeRecovered) => {
    _logger("onRecoverSuccess is firing!");
    return () => {
      setTableData((prevState) => {
        const updatedData = { ...prevState };
        updatedData.arrayOfFiles = updatedData.arrayOfFiles.filter(
          (file) => file.id !== idToBeRecovered
        );
        updatedData.fileComponents = updatedData.arrayOfFiles.map(mapTableRow);
        return updatedData;
      });
    };
  };

  const onRecoverError = (error) => {
    _logger("onRecoverError is firing!");
    _logger("onRecoverError is: ", error);
    toastr.error("Unsuccessful recovery. Please try again.", {
      timeOut: 5000,
    });
  };

  const searchFieldOnChange = (e) => {
    _logger("Seach Input Field Value: ", e.target.value);
    setSearchFilesInputField(e.target.value);
  };

  const mapTableRow = (aFile) => {
    return (
      <FileManagerRow
        key={aFile.id}
        theFile={aFile}
        onDeleteRequested={onDeleteRequested}
        onRecoverRequested={onRecoverRequested}
      />
    );
  };

  const searchFieldResetBtnHandler = () => {
    setSearchFilesInputField("");
    setSearchPage(1);
    fileManagerService
      .getFilesByName(0, 10, searchFilesInputField)
      .then(getSearchByNameOnSuccess)
      .catch(getSearchByNameOnError);
  };

  const activeFilesResetBtnHandler = () => {
    _logger("activeFilesResetBtnHandler is firing!");
    setCurrentPage(1);
    fileManagerService
      .getActiveFiles(0, 10, false)
      .then(getFileDataOnSuccess)
      .catch(getFileDataOnError);
  };

  return (
    <React.Fragment>
      <div className="main-container">
        <div className="table-responsive table-main-container scroll">
          <div className="row">
            <div className="col-12">
              <div className="fm-table-header">
                <h1 className="page-header">File Manager Dashboard</h1>
              </div>
              <div className="dashboard-page-nav-container">
                <div className="prev-btn">
                  <button
                    type="button"
                    className="btn btn-secondary active-prev-btn"
                    onClick={handlePrevPage}
                    disabled={isActivePrevDisabled}
                  >
                    Previous Active File Page
                  </button>
                </div>
                <div className="reset-activelist-btn">
                  <button
                    className="btn btn-secondary reset-active-btn"
                    onClick={activeFilesResetBtnHandler}
                  >
                    <div>Reset Active Pages</div>
                  </button>
                </div>
                <div className="next-btn">
                  <button
                    type="button"
                    className="btn btn-secondary active-next-btn"
                    onClick={handleNextPage}
                    disabled={isActiveNextDisabled}
                  >
                    Next Active File Page
                  </button>
                </div>
              </div>
              <div className="table-controls-container">
                <div className="search-group">
                  <div className="search-by-name-prev-page search-buttons">
                    <div className="reset-search-btn-container">
                      <button
                        className="btn btn-secondary reset-search-btn"
                        onClick={searchFieldResetBtnHandler}
                      >
                        <div>Reset</div>
                        <div>Search</div>
                      </button>
                    </div>
                  </div>
                  <div className="search-files-by-name-field">
                    <input
                      value={searchFilesInputField}
                      onChange={searchFieldOnChange}
                      type="text"
                      className="search-control"
                      placeholder="Search for files..."
                      aria-label="Search input"
                    />
                  </div>
                  <div className="search-prev-btn">
                    <button
                      className="btn btn-secondary search-by-name-prev-page-btn"
                      onClick={handleSearchPrevPage}
                      disabled={isPrevSearchDisabled}
                    >
                      <div>Search</div>
                      <div>Previous</div>
                    </button>
                  </div>
                  <div className="search-by-name-next-page search-buttons">
                    <button
                      className="btn btn-secondary search-by-name-next-page-btn"
                      onClick={handleSearchNextPage}
                      disabled={isNextSearchDisabled}
                    >
                      <div>Search</div>
                      <div>Next</div>
                    </button>
                  </div>
                </div>
              </div>
              <div className="view-toggle-container">
                <div className="parent-comp-buttons">
                  <button
                    onClick={toggleView}
                    type="button"
                    className={`btn ${
                      isShowActiveView
                        ? " btn-secondary show-active-btn"
                        : "btn-secondary show-deleted-btn"
                    } show-all-active-files-btn`}
                  >
                    {isShowActiveView
                      ? "Showing All Active Files"
                      : "Showing All Deleted Files"}
                  </button>
                </div>
              </div>

              <div className="parent-table-container">
                <table className="text-nowrap table-sm actual-table">
                  <thead className="table-info">
                    <tr className="fixed-header-row">
                      <th scope="col">Id</th>
                      <th scope="col">Name</th>
                      <th scope="col">FileType</th>
                      <th scope="col">Url</th>
                      <th scope="col">CreatedBy</th>
                      <th scope="col">DateCreated</th>
                      <th scope="col">Admin Actions</th>
                    </tr>
                  </thead>
                  <tbody>{tableData.fileComponents}</tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </React.Fragment>
  );
}

export default FileManager;
